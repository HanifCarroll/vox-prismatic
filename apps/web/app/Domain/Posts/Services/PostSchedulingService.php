<?php

namespace App\Domain\Posts\Services;

use App\Domain\Posts\Repositories\PostRepository;
use App\Exceptions\ValidationException;
use App\Models\ContentProject;
use App\Models\Post;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class PostSchedulingService
{
    public function __construct(
        private readonly PostStateService $state,
        private readonly PostRepository $posts,
    ) {
    }

    public function schedule(Post $post, ContentProject $project, User $user, CarbonInterface $scheduledAt): CarbonInterface
    {
        $this->assertOwnership($post, $project);
        $this->assertApproved($post);
        $this->assertLinkedInConnected($user);

        $preferences = $this->getPreferences($user);
        $leadMinutes = (int) ($preferences->lead_time_minutes ?? 0);

        $nowUtc = now()->utc();
        $scheduledUtc = $scheduledAt->copy()->utc();

        if ($scheduledUtc->lessThanOrEqualTo($nowUtc)) {
            throw new ValidationException('Scheduled time must be in the future');
        }

        if ($leadMinutes > 0 && $scheduledUtc->lessThan($nowUtc->copy()->addMinutes($leadMinutes))) {
            throw new ValidationException("Scheduled time must be at least {$leadMinutes} minutes from now");
        }

        $this->state->schedule((string) $post->id, $scheduledUtc);

        return $scheduledUtc;
    }

    public function unschedule(Post $post, ContentProject $project): void
    {
        $this->assertOwnership($post, $project);
        $this->state->unschedule((string) $post->id);
    }

    /**
     * @param array<int, string> $postIds
     */
    public function bulkUnschedule(ContentProject $project, array $postIds): int
    {
        $postIds = array_values(array_unique(array_map('strval', $postIds)));

        if (empty($postIds)) {
            return 0;
        }

        return $this->state->bulkUnschedule((string) $project->id, $postIds);
    }

    public function autoSchedule(Post $post, ContentProject $project, User $user): CarbonInterface
    {
        $this->assertOwnership($post, $project);
        $this->assertApproved($post);
        $this->assertEligibleForScheduling($post);
        $this->assertLinkedInConnected($user);

        $preferences = $this->getPreferences($user);
        $slots = $this->getActiveSlots($user);

        if ($slots->isEmpty()) {
            throw new ValidationException('No preferred timeslots configured');
        }

        $lead = (int) ($preferences->lead_time_minutes ?? 30);
        $timezone = (string) ($preferences->timezone ?? 'UTC');
        $candidate = now($timezone)->addMinutes($lead);

        $next = $this->nextAvailableSlot($slots, $candidate);

        if (! $next) {
            throw new ValidationException('No available timeslot');
        }

        $this->state->schedule((string) $post->id, $next->utc());

        return $next->utc();
    }

    /**
     * @param array<int, string>|null $selectedIds
     */
    public function autoScheduleProject(ContentProject $project, User $user, ?array $selectedIds = null): int
    {
        $this->assertLinkedInConnected($user);

        $preferences = $this->getPreferences($user);
        $slots = $this->getActiveSlots($user);

        if ($slots->isEmpty()) {
            throw new ValidationException('No preferred timeslots configured');
        }

        $selected = collect($selectedIds)
            ->filter()
            ->map(fn ($id) => (string) $id)
            ->unique();

        $eligiblePosts = $this->getEligiblePostsForAutoSchedule((string) $project->id, $selected);

        if ($eligiblePosts->isEmpty()) {
            if ($selected->isNotEmpty()) {
                throw new ValidationException('Selected posts must be approved and unscheduled before auto-scheduling.');
            }

            throw new ValidationException('No approved posts ready for auto-scheduling.');
        }

        $lead = (int) ($preferences->lead_time_minutes ?? 30);
        $timezone = (string) ($preferences->timezone ?? 'UTC');
        $candidate = now($timezone)->addMinutes($lead);
        $scheduledCount = 0;

        foreach ($eligiblePosts as $row) {
            $next = $this->nextAvailableSlot($slots, $candidate);

            if (! $next) {
                break;
            }

            $this->state->schedule((string) $row->id, $next->utc());
            $scheduledCount++;

            $candidate = $next->copy()->addSecond();
        }

        if ($scheduledCount === 0) {
            throw new ValidationException('No available timeslot');
        }

        return $scheduledCount;
    }

    private function assertOwnership(Post $post, ContentProject $project): void
    {
        if ((string) $post->project_id !== (string) $project->id) {
            throw new ValidationException('Post does not belong to this project');
        }
    }

    private function assertApproved(Post $post): void
    {
        if ($post->status !== 'approved') {
            throw new ValidationException('Post must be approved before scheduling');
        }
    }

    private function assertEligibleForScheduling(Post $post): void
    {
        if ($post->scheduled_at && $post->schedule_status === 'scheduled') {
            throw new ValidationException('Post is already scheduled. Unschedule it first.');
        }
    }

    private function assertLinkedInConnected(User $user): void
    {
        if (! $user->linkedin_token) {
            throw new ValidationException('LinkedIn is not connected');
        }
    }

    private function getPreferences(User $user): object
    {
        return DB::table('user_schedule_preferences')
            ->where('user_id', $user->id)
            ->first() ?? (object) [];
    }

    private function getActiveSlots(User $user): Collection
    {
        return DB::table('user_preferred_timeslots')
            ->where('user_id', $user->id)
            ->where('active', true)
            ->orderBy('iso_day_of_week')
            ->orderBy('minutes_from_midnight')
            ->get();
    }

    /**
     * @param Collection<int, object> $slots
     */
    private function nextAvailableSlot(Collection $slots, CarbonInterface $candidate, int $maxIterations = 120): ?CarbonInterface
    {
        if ($slots->isEmpty()) {
            return null;
        }

        $candidate = $candidate->copy();

        for ($i = 0; $i < $maxIterations; $i++) {
            $best = null;

            foreach ($slots as $slot) {
                $slotDay = (int) $slot->iso_day_of_week;
                $slotMinutes = (int) $slot->minutes_from_midnight;
                $dayDiff = ($slotDay - $candidate->dayOfWeekIso + 7) % 7;

                $occurrence = $candidate
                    ->copy()
                    ->addDays($dayDiff)
                    ->setTime(intdiv($slotMinutes, 60), $slotMinutes % 60, 0);

                if ($occurrence->lessThan($candidate)) {
                    $occurrence = $occurrence->addDays(7);
                }

                if ($best === null || $occurrence->lessThan($best)) {
                    $best = $occurrence;
                }
            }

            if ($best !== null) {
                return $best;
            }

            $candidate = $candidate->copy()->addDay()->startOfDay();
        }

        return null;
    }

    /**
     * @param \Illuminate\Support\Collection<int, string> $selectedIds
     */
    private function getEligiblePostsForAutoSchedule(string $projectId, Collection $selectedIds): Collection
    {
        $query = DB::table('posts')
            ->where('project_id', $projectId)
            ->where('status', 'approved')
            ->whereNull('scheduled_at');

        if ($selectedIds->isNotEmpty()) {
            $query->whereIn('id', $selectedIds->all());
        }

        return $query->orderBy('created_at')->get();
    }
}


<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\UserPreferredTimeslot;
use App\Models\UserSchedulePreference;
use App\Models\UserStyleProfile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Prefer `section` query param; accept legacy `tab` for compatibility
        $tab = $request->query('section', $request->query('tab'));
        $allowedTabs = ['integrations', 'style', 'scheduling'];
        if (! in_array($tab, $allowedTabs, true)) {
            // No explicit tab selected: do not default to any section
            $tab = null;
        }

        $style = UserStyleProfile::query()->where('user_id', $user->id)->first()?->style ?? null;

        $prefRow = UserSchedulePreference::query()->where('user_id', $user->id)->first();
        $preferences = [
            'timezone' => $prefRow?->timezone ?? 'UTC',
            'leadTimeMinutes' => (int) ($prefRow?->lead_time_minutes ?? 30),
        ];

        $slots = UserPreferredTimeslot::query()
            ->where('user_id', $user->id)
            ->where('active', true)
            ->orderBy('iso_day_of_week')
            ->orderBy('minutes_from_midnight')
            ->get()
            ->map(function (UserPreferredTimeslot $slot) {
                $hours = str_pad((string) intdiv((int) $slot->minutes_from_midnight, 60), 2, '0', STR_PAD_LEFT);
                $minutes = str_pad((string) ((int) $slot->minutes_from_midnight % 60), 2, '0', STR_PAD_LEFT);
                return [
                    'isoDayOfWeek' => (int) $slot->iso_day_of_week,
                    'time' => $hours . ':' . $minutes,
                    'active' => (bool) $slot->active,
                ];
            })
            ->values()
            ->all();

        $props = [
            'linkedIn' => [
                'connected' => (bool) $user->linkedin_token,
            ],
            'style' => $style ? Arr::only($style, [
                'tone',
                'audience',
                'goals',
                'emojiPolicy',
                'constraints',
                'hashtagPolicy',
                'glossary',
                'examples',
                'defaultPostType',
            ]) : null,
            'preferences' => $preferences,
            'slots' => $slots,
        ];

        if ($tab !== null) {
            $props['initialTab'] = $tab;
        }

        return Inertia::render('Settings/Index', $props);
    }

    public function putStyle(Request $request)
    {
        $user = $request->user();
        $data = $request->validate(['style' => ['required','array']]);
        $exists = UserStyleProfile::query()->where('user_id', $user->id)->exists();
        if ($exists) {
            DB::table('user_style_profiles')->where('user_id', $user->id)->update([
                'style' => json_encode($data['style']),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('user_style_profiles')->insert([
                'user_id' => $user->id,
                'style' => json_encode($data['style']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        return redirect()->route('settings.index', ['section' => 'style'])->with('status', 'Writing style saved.');
    }

    public function updatePreferences(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'timezone' => ['required','string'],
            'leadTimeMinutes' => ['required','integer','min:0','max:1440'],
        ]);
        $payload = [
            'user_id' => $user->id,
            'timezone' => $data['timezone'],
            'lead_time_minutes' => $data['leadTimeMinutes'],
            'updated_at' => now(),
        ];
        $exists = UserSchedulePreference::query()->where('user_id', $user->id)->exists();
        if ($exists) {
            DB::table('user_schedule_preferences')->where('user_id', $user->id)->update($payload);
        } else {
            $payload['created_at'] = now();
            DB::table('user_schedule_preferences')->insert($payload);
        }
        return redirect()->route('settings.index', ['section' => 'scheduling'])->with('status', 'Scheduling preferences saved.');
    }

    public function updateSlots(Request $request)
    {
        $user = $request->user();
        $data = $request->validate(['items' => ['required','array','min:1']]);
        DB::table('user_preferred_timeslots')->where('user_id', $user->id)->delete();
        $rows = [];
        foreach ($data['items'] as $it) {
            $iso = (int) ($it['isoDayOfWeek'] ?? 1);
            $time = (string) ($it['time'] ?? '00:00');
            [$hh,$mm] = array_pad(explode(':',$time),2,'0');
            $minutes = ((int)$hh) * 60 + ((int)$mm);
            $rows[] = [
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'iso_day_of_week' => $iso,
                'minutes_from_midnight' => $minutes,
                'active' => isset($it['active']) ? (bool)$it['active'] : true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        if (!empty($rows)) {
            DB::table('user_preferred_timeslots')->insert($rows);
        }
        return redirect()->route('settings.index', ['section' => 'scheduling'])->with('status', 'Preferred timeslots updated.');
    }

    public function disconnectLinkedIn(Request $request)
    {
        $user = $request->user();
        DB::table('users')->where('id', $user->id)->update(['linkedin_token' => null, 'linkedin_id' => null]);
        return redirect()->route('settings.index', ['section' => 'integrations'])->with('status', 'Disconnected from LinkedIn.');
    }
}

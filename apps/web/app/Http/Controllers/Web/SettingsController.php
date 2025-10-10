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
        $allowedTabs = ['integrations', 'style', 'scheduling', 'danger'];
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
                'offer',
                'services',
                'idealCustomer',
                'outcomes',
                'promotionGoal',
                'tonePreset',
                'toneNote',
                'perspective',
                'personaPreset',
                'personaCustom',
            ]) : null,
            'preferences' => $preferences,
            'slots' => $slots,
            'styleOptions' => config('writing_style'),
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
        $stylePayload = $this->sanitizeStyle($data['style']);

        $exists = UserStyleProfile::query()->where('user_id', $user->id)->exists();
        if ($exists) {
            DB::table('user_style_profiles')->where('user_id', $user->id)->update([
                'style' => json_encode($stylePayload),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('user_style_profiles')->insert([
                'user_id' => $user->id,
                'style' => json_encode($stylePayload),
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

    public function deleteAccount(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'currentPassword' => ['required','current_password:web'],
            'confirm' => ['required','in:DELETE'],
        ]);

        app(\App\Services\UserAccountService::class)->deleteUser($user);

        \Illuminate\Support\Facades\Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['success' => true]);
    }

    /**
     * Normalise the incoming writing style payload so we only persist supported MVP fields.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function sanitizeStyle(array $input): array
    {
        $options = config('writing_style');
        $tonePresets = array_column($options['tones'] ?? [], 'value');
        $perspectives = array_column($options['perspectives'] ?? [], 'value');
        $promotionGoals = ['none', 'traffic', 'leads', 'launch'];

        $tonePreset = $input['tonePreset'] ?? null;
        if (! in_array($tonePreset, $tonePresets, true)) {
            $tonePreset = $tonePresets[0] ?? 'confident';
        }

        $perspective = $input['perspective'] ?? null;
        if (! in_array($perspective, $perspectives, true)) {
            $perspective = $perspectives[0] ?? 'first_person';
        }

        $promotionGoal = $input['promotionGoal'] ?? 'none';
        if (! in_array($promotionGoal, $promotionGoals, true)) {
            $promotionGoal = 'none';
        }

        return [
            'offer' => $this->cleanString($input['offer'] ?? null),
            'services' => $this->cleanList($input['services'] ?? null, 5),
            'idealCustomer' => $this->cleanString($input['idealCustomer'] ?? null),
            'outcomes' => $this->cleanList($input['outcomes'] ?? null, 5),
            'promotionGoal' => $promotionGoal,
            'tonePreset' => $tonePreset,
            'toneNote' => $this->cleanString($input['toneNote'] ?? null),
            'perspective' => $perspective,
        ];
    }

    private function cleanString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * @param  mixed  $value
     * @return array<int, string>
     */
    private function cleanList(mixed $value, int $limit = 5): array
    {
        $items = [];

        if (is_string($value)) {
            $items = preg_split('/[\r\n]+/', $value) ?: [];
        } elseif (is_array($value)) {
            $items = $value;
        }

        $cleaned = [];
        foreach ($items as $item) {
            if (! is_string($item)) {
                continue;
            }
            $trimmed = trim($item);
            if ($trimmed === '') {
                continue;
            }
            $cleaned[] = mb_substr($trimmed, 0, 160);
            if (count($cleaned) >= $limit) {
                break;
            }
        }

        return $cleaned;
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\UserPreferredTimeslot;
use App\Models\UserSchedulePreference as Pref;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SchedulingController extends Controller
{
    public function getPreferences(Request $request): JsonResponse
    {
        $user = $request->user();
        $row = Pref::query()->where('user_id', $user->id)->first();
        $tz = $row?->timezone ?? 'UTC';
        $lead = (int) ($row?->lead_time_minutes ?? 30);
        return response()->json(['preferences' => ['timezone' => $tz, 'leadTimeMinutes' => $lead]]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'timezone' => ['required','string'],
            'leadTimeMinutes' => ['required','integer','min:0','max:1440'],
        ]);
        $payload = ['user_id'=>$user->id,'timezone'=>$data['timezone'],'lead_time_minutes'=>$data['leadTimeMinutes'],'updated_at'=>now()];
        $exists = Pref::query()->where('user_id',$user->id)->exists();
        if ($exists) {
            DB::table('user_schedule_preferences')->where('user_id',$user->id)->update($payload);
        } else {
            $payload['created_at'] = now();
            DB::table('user_schedule_preferences')->insert($payload);
        }
        return response()->json(['preferences' => ['timezone'=>$data['timezone'], 'leadTimeMinutes'=>$data['leadTimeMinutes']]]);
    }

    public function getSlots(Request $request): JsonResponse
    {
        $user = $request->user();
        $rows = UserPreferredTimeslot::query()
            ->where('user_id',$user->id)->where('active',true)
            ->orderBy('iso_day_of_week')->orderBy('minutes_from_midnight')->get();
        $items = $rows->map(function($r){
            $hh = str_pad((string) floor($r->minutes_from_midnight/60),2,'0',STR_PAD_LEFT);
            $mm = str_pad((string) ($r->minutes_from_midnight%60),2,'0',STR_PAD_LEFT);
            return [
                'isoDayOfWeek' => (int) $r->iso_day_of_week,
                'time' => "$hh:$mm",
                'active' => (bool) $r->active,
            ];
        })->values();
        return response()->json(['items' => $items]);
    }

    public function updateSlots(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate(['items' => ['required','array','min:1']]);
        DB::table('user_preferred_timeslots')->where('user_id',$user->id)->delete();
        $rows = [];
        foreach ($data['items'] as $it) {
            $iso = (int) ($it['isoDayOfWeek'] ?? 1);
            $time = (string) ($it['time'] ?? '00:00');
            [$hh,$mm] = array_pad(explode(':',$time),2,'0');
            $minutes = ((int)$hh)*60 + ((int)$mm);
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
        if ($rows) DB::table('user_preferred_timeslots')->insert($rows);
        return response()->json(['items' => $data['items']]);
    }
}


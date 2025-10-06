<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Auth\RegisteredUserController;
use App\Models\Invite;
use App\Support\RegistrationMode;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminInvitesController extends Controller
{
    public function index(Request $request): Response
    {
        $this->ensureAdmin($request);

        $invites = Invite::query()
            ->with('creator:id,name,email')
            ->orderByDesc('created_at')
            ->limit(150)
            ->get()
            ->map(function (Invite $invite) {
                return [
                    'id' => $invite->id,
                    'code' => $invite->code,
                    'email' => $invite->email,
                    'maxUses' => $invite->max_uses,
                    'uses' => $invite->uses,
                    'remainingUses' => $invite->remainingUses(),
                    'expiresAt' => $invite->expires_at?->toAtomString(),
                    'notes' => $invite->notes,
                    'createdAt' => $invite->created_at?->toAtomString(),
                    'lastUsedAt' => $invite->last_used_at?->toAtomString(),
                    'creator' => $invite->creator ? [
                        'id' => $invite->creator->id,
                        'name' => $invite->creator->name,
                        'email' => $invite->creator->email,
                    ] : null,
                ];
            });

        return Inertia::render('Admin/Invites', [
            'invites' => $invites,
            'mode' => RegistrationMode::fromString(config('auth.registration_mode'))->value,
            'contactEmail' => RegisteredUserController::CONTACT_EMAIL,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $admin = $this->ensureAdmin($request);

        $data = $request->validate([
            'email' => ['nullable', 'string', 'email'],
            'maxUses' => ['required', 'integer', 'min:1', 'max:100'],
            'expiresAt' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [], [
            'maxUses' => 'maximum uses',
            'expiresAt' => 'expiration',
        ]);

        $email = isset($data['email'])
            ? Str::of($data['email'])->lower()->trim()->value()
            : null;

        $expiresAt = isset($data['expiresAt']) ? Carbon::parse($data['expiresAt']) : null;
        $notes = isset($data['notes']) ? Str::of($data['notes'])->trim()->value() : null;
        if ($notes === '') {
            $notes = null;
        }

        $invite = new Invite();
        $invite->id = (string) Str::uuid();
        $invite->code = (string) Str::uuid();
        $invite->email = $email;
        $invite->max_uses = (int) $data['maxUses'];
        $invite->expires_at = $expiresAt;
        $invite->created_by = $admin->id;
        $invite->notes = $notes;
        $invite->uses = 0;
        $invite->save();

        Log::info('admin.invite.created', [
            'invite_id' => $invite->id,
            'admin_id' => $admin->id,
        ]);

        return redirect()->back()->with('status', 'Invite created.');
    }

    public function destroy(Request $request, Invite $invite): RedirectResponse
    {
        $admin = $this->ensureAdmin($request);

        $inviteId = $invite->id;
        $invite->delete();

        Log::info('admin.invite.deleted', [
            'invite_id' => $inviteId,
            'admin_id' => $admin->id,
        ]);

        return redirect()->back()->with('status', 'Invite removed.');
    }

    private function ensureAdmin(Request $request)
    {
        $user = $request->user();
        if (! $user?->is_admin) {
            abort(403);
        }

        return $user;
    }
}

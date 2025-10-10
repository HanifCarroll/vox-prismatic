<?php

namespace App\Http\Controllers\Web;

use App\Domain\Posts\Services\LinkedInPublisher;
use App\Exceptions\ValidationException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\ManagesProjectPosts;
use App\Models\ContentProject;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PostPublishingController extends Controller
{
    use ManagesProjectPosts;

    public function __construct(private readonly LinkedInPublisher $publisher)
    {
    }

    public function publish(Request $request, ContentProject $project, Post $post): RedirectResponse
    {
        $this->authorizeProject($request, $project);
        $this->ensurePostOnProject($post, $project);

        try {
            $this->publisher->publish($post, $project, $request->user());

            return back()->with('status', 'Post published.');
        } catch (ValidationException $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}


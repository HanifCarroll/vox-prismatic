import { createNotionClient, posts } from '../lib/notion.ts';
import { schedulePostToPlatform, getScheduledPosts } from '../lib/postiz.ts';
import type { AppConfig } from '../lib/types.ts';
import { createConfig } from '../lib/config.ts';

/**
 * Visual calendar scheduler server
 * Provides drag-and-drop interface for post scheduling
 */

let config: AppConfig;

/**
 * Initialize configuration
 */
const initConfig = async (): Promise<void> => {
  try {
    config = createConfig();
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Handle API requests for posts
 */
const handleGetPosts = async (): Promise<Response> => {
  try {
    const notionClient = createNotionClient(config.notion);
    const result = await posts.getReadyToSchedule(notionClient, config.notion);
    
    if (!result.success) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    // Add content preview for each post
    const postsWithContent = await Promise.all(
      result.data.map(async (post) => {
        try {
          const response = await notionClient.blocks.children.list({
            block_id: post.id,
            page_size: 5
          });

          let content = '';
          for (const block of response.results) {
            const fullBlock = block as any;
            if (fullBlock.type === 'paragraph' && fullBlock.paragraph?.rich_text) {
              const text = fullBlock.paragraph.rich_text.map((rt: any) => rt.plain_text).join('');
              content += text + ' ';
              if (content.length > 200) break;
            }
          }

          return {
            ...post,
            content: content.trim() || 'No content preview available'
          };
        } catch (error) {
          return {
            ...post,
            content: 'Failed to load content'
          };
        }
      })
    );

    return Response.json({ success: true, data: postsWithContent });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return Response.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
};

/**
 * Handle API requests for scheduled posts
 */
const handleGetScheduled = async (): Promise<Response> => {
  try {
    const result = await getScheduledPosts(config.postiz);
    
    if (!result.success) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    // Transform for FullCalendar format
    const events = result.data.map((post: any) => {
      // Get platform from integration.providerIdentifier (lowercase)
      const platform = post.integration?.providerIdentifier || post.platform || 'unknown';
      
      return {
        id: post.id,
        title: `${platform.toUpperCase()}: ${post.content.substring(0, 50)}...`,
        start: post.publishDate || post.scheduledDate,
        backgroundColor: platform === 'linkedin' ? '#0077b5' : '#1da1f2',
        borderColor: platform === 'linkedin' ? '#005885' : '#1991db',
        extendedProps: {
          platform: platform,
          content: post.content,
          integrationName: post.integration?.name,
          fullPost: post // Store the full post data for the modal
        }
      };
    });

    return Response.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    return Response.json({ error: 'Failed to fetch scheduled posts' }, { status: 500 });
  }
};

/**
 * Handle post editing requests
 */
const handleEditPost = async (req: Request): Promise<Response> => {
  try {
    const { postId, content } = await req.json();
    
    console.log(`✏️ Editing post ${postId}`);
    
    const notionClient = createNotionClient(config.notion);
    
    // Update the post content in Notion
    await notionClient.blocks.children.list({
      block_id: postId
    }).then(async (response) => {
      // Delete existing content blocks
      const blockIds = response.results.map((block: any) => block.id);
      for (const blockId of blockIds) {
        await notionClient.blocks.delete({ block_id: blockId });
      }
      
      // Add new content as paragraph blocks
      const paragraphs = content.split('\n').filter((p: string) => p.trim());
      const blocks = paragraphs.map((paragraph: string) => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: paragraph }
          }]
        }
      }));
      
      if (blocks.length > 0) {
        await notionClient.blocks.children.append({
          block_id: postId,
          children: blocks
        });
      }
    });

    return Response.json({ 
      success: true, 
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Error editing post:', error);
    return Response.json({ error: 'Failed to edit post' }, { status: 500 });
  }
};

/**
 * Handle post scheduling requests
 */
const handleSchedulePost = async (req: Request): Promise<Response> => {
  try {
    const { postId, platform, content, datetime } = await req.json();
    
    console.log(`📅 Scheduling post ${postId} for ${datetime}`);
    
    const result = await schedulePostToPlatform(
      config.postiz,
      platform,
      content,
      datetime
    );
    
    if (!result.success) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    // Update Notion status
    const notionClient = createNotionClient(config.notion);
    await posts.updateStatus(notionClient, postId, 'Scheduled', datetime);

    return Response.json({ 
      success: true, 
      message: 'Post scheduled successfully',
      data: result.data 
    });
  } catch (error) {
    console.error('Error scheduling post:', error);
    return Response.json({ error: 'Failed to schedule post' }, { status: 500 });
  }
};

/**
 * Serve the main calendar HTML
 */
const getCalendarHTML = (): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Scheduler - Drag & Drop Calendar</title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- FullCalendar CSS & JS (using index.global.min.js for better compatibility) -->
    <link href='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/main.min.css' rel='stylesheet' />
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js'></script>
    
    <!-- Custom Tailwind config -->
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              linkedin: '#0077b5',
              twitter: '#1da1f2',
            }
          }
        }
      }
    </script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Content Scheduler</h1>
            <p class="text-gray-600">Drag posts from the sidebar onto the calendar to schedule them</p>
        </div>

        <div class="grid grid-cols-12 gap-6">
            <!-- Posts Sidebar -->
            <div class="col-span-12 lg:col-span-3">
                <div class="bg-white rounded-lg shadow-sm border p-4">
                    <h2 class="text-lg font-semibold text-gray-900 mb-4">
                        Posts Ready to Schedule
                        <span id="posts-count" class="text-sm font-normal text-gray-500 ml-2"></span>
                    </h2>
                    <div id="posts-list" class="space-y-3">
                        <!-- Posts will be loaded here -->
                        <div class="animate-pulse">
                            <div class="h-20 bg-gray-200 rounded"></div>
                            <div class="h-20 bg-gray-200 rounded mt-3"></div>
                            <div class="h-20 bg-gray-200 rounded mt-3"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Calendar -->
            <div class="col-span-12 lg:col-span-9">
                <div class="bg-white rounded-lg shadow-sm border p-4">
                    <div id="calendar"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Success/Error Messages -->
    <div id="notifications" class="fixed top-4 right-4 z-50"></div>

    <!-- Edit Post Modal -->
    <div id="edit-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50" onclick="closeEditModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onclick="event.stopPropagation()">
                <div class="p-4 border-b flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900">Edit Post</h3>
                    <button class="text-gray-400 hover:text-gray-600" onclick="closeEditModal()">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="p-4 flex-1 overflow-y-auto">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Post Content</label>
                        <textarea 
                            id="edit-content" 
                            class="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Enter your post content..."
                        ></textarea>
                    </div>
                    
                    <div class="text-sm text-gray-500 mb-4">
                        <span id="char-count">0</span> characters
                    </div>
                </div>
                
                <div class="p-4 border-t flex items-center justify-between">
                    <div class="flex items-center">
                        <span id="edit-platform-badge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"></span>
                        <span id="edit-post-title" class="ml-2 text-sm text-gray-600"></span>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button 
                            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                            onclick="closeEditModal()"
                        >
                            Cancel
                        </button>
                        <button 
                            id="save-post-btn"
                            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            onclick="savePost()"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Global variables
        let calendar;
        let posts = [];
        let currentEditingPost = null;
        
        // Initialize the application when everything is loaded
        window.addEventListener('load', function() {
            // Add a small delay to ensure FullCalendar is fully loaded
            setTimeout(() => {
                initializeCalendar();
                loadPosts();
                loadScheduledPosts();
            }, 100);
        });

        // Initialize FullCalendar
        function initializeCalendar() {
            const calendarEl = document.getElementById('calendar');
            
            // Wait for FullCalendar to load
            if (typeof FullCalendar === 'undefined') {
                console.error('FullCalendar not loaded');
                return;
            }
            
            calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                },
                height: 'auto',
                droppable: true,
                dropAccept: '.draggable-post',
                drop: function(info) {
                    const postId = info.draggedEl.dataset.postId;
                    const post = posts.find(p => p.id === postId);
                    
                    if (post) {
                        schedulePost(post, info.date);
                    }
                },
                eventClick: function(info) {
                    showEventDetails(info.event);
                }
            });
            
            calendar.render();
        }

        // Load posts from API
        async function loadPosts() {
            try {
                console.log('Loading posts...');
                const response = await fetch('/api/posts');
                const result = await response.json();
                
                console.log('Posts result:', result);
                console.log('Sample post:', result.success && result.data.length > 0 ? result.data[0] : 'No posts');
                
                if (result.success) {
                    posts = result.data;
                    renderPosts(posts);
                } else {
                    showNotification('Failed to load posts: ' + result.error, 'error');
                }
            } catch (error) {
                console.log('Posts loading error:', error);
                showNotification('Error loading posts: ' + error.message, 'error');
            }
        }

        // Load scheduled posts from API
        async function loadScheduledPosts() {
            try {
                console.log('Loading scheduled posts...');
                const response = await fetch('/api/scheduled');
                const result = await response.json();
                
                console.log('Scheduled posts result:', result);
                
                if (result.success) {
                    console.log(\`Adding \${result.data.length} scheduled posts to calendar\`);
                    // Add events to calendar
                    result.data.forEach(event => {
                        console.log('Adding event:', event);
                        calendar.addEvent(event);
                    });
                } else {
                    console.warn('Failed to load scheduled posts:', result.error);
                    showNotification('Failed to load scheduled posts: ' + result.error, 'warning');
                }
            } catch (error) {
                console.warn('Error loading scheduled posts:', error);
                showNotification('Error loading scheduled posts: ' + error.message, 'warning');
            }
        }

        // Render posts in sidebar
        function renderPosts(posts) {
            const postsContainer = document.getElementById('posts-list');
            const postsCount = document.getElementById('posts-count');
            
            postsCount.textContent = \`(\${posts.length})\`;
            
            if (posts.length === 0) {
                postsContainer.innerHTML = \`
                    <div class="text-center py-8 text-gray-500">
                        <p>No posts ready to schedule</p>
                        <p class="text-sm mt-1">Create and approve some posts first!</p>
                    </div>
                \`;
                return;
            }

            postsContainer.innerHTML = posts.map(post => \`
                <div class="draggable-post cursor-move p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
                     draggable="true"
                     data-post-id="\${post.id}"
                     data-platform="\${post.platform}"
                     data-content="\${encodeURIComponent(post.content)}">
                    
                    <div class="flex items-center mb-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${
                            post.platform === 'LinkedIn' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-sky-100 text-sky-800'
                        }">
                            \${post.platform}
                        </span>
                    </div>
                    
                    <h3 class="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                        \${post.title}
                    </h3>
                    
                    <p class="text-xs text-gray-600 line-clamp-3">
                        \${post.content.substring(0, 120)}...
                    </p>
                    
                    <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <div class="flex items-center">
                            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M7 3V1a1 1 0 112 0v2h4V1a1 1 0 112 0v2h2a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2h2z"/>
                            </svg>
                            Drag to schedule
                        </div>
                        <button class="edit-post-btn text-blue-600 hover:text-blue-800 font-medium" 
                                data-post-id="\${post.id}"
                                onclick="editPost('\${post.id}', event)">
                            Edit
                        </button>
                    </div>
                </div>
            \`).join('');

            // Add drag event listeners
            document.querySelectorAll('.draggable-post').forEach(el => {
                el.addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('text/plain', '');
                    this.style.opacity = '0.5';
                });
                
                el.addEventListener('dragend', function(e) {
                    this.style.opacity = '1';
                });
            });
        }

        // Schedule a post
        async function schedulePost(post, date) {
            // Format the date for the API (add time if not present)
            let scheduledDate = date;
            if (typeof date === 'object' && !date.toISOString) {
                // If it's a FullCalendar date, convert it
                scheduledDate = date.toISOString();
            } else if (typeof date === 'string') {
                // If it's a date string without time, add a default time
                const dateObj = new Date(date);
                if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
                    dateObj.setHours(9, 0, 0, 0); // Default to 9 AM
                }
                scheduledDate = dateObj.toISOString();
            }

            showNotification(\`Scheduling "\${post.title.substring(0, 30)}..." for \${new Date(scheduledDate).toLocaleString()}\`, 'info');

            try {
                const response = await fetch('/api/schedule', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        postId: post.id,
                        platform: post.platform,
                        content: post.content,
                        datetime: scheduledDate
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showNotification(\`Successfully scheduled "\${post.title.substring(0, 30)}..."\`, 'success');
                    
                    // Add event to calendar
                    calendar.addEvent({
                        id: post.id,
                        title: \`\${post.platform.toUpperCase()}: \${post.title.substring(0, 40)}...\`,
                        start: scheduledDate,
                        backgroundColor: post.platform === 'LinkedIn' ? '#0077b5' : '#1da1f2',
                        borderColor: post.platform === 'LinkedIn' ? '#005885' : '#1991db',
                        extendedProps: {
                            platform: post.platform,
                            content: post.content,
                            originalTitle: post.title
                        }
                    });
                    
                    // Remove post from sidebar
                    posts = posts.filter(p => p.id !== post.id);
                    renderPosts(posts);
                    
                } else {
                    showNotification('Failed to schedule post: ' + result.error, 'error');
                }
            } catch (error) {
                showNotification('Error scheduling post: ' + error.message, 'error');
            }
        }

        // Show event details in view modal
        function showEventDetails(event) {
            const props = event.extendedProps;
            currentViewingEvent = event;
            
            // Update modal content for viewing
            const modalTitle = document.querySelector('#edit-modal h3');
            modalTitle.textContent = 'View Scheduled Post';
            
            const textarea = document.getElementById('edit-content');
            textarea.value = props.content || '';
            textarea.disabled = true; // Make it read-only initially
            textarea.style.backgroundColor = '#f9fafb'; // Gray background for read-only
            
            // Update platform badge
            const badge = document.getElementById('edit-platform-badge');
            const platform = props.platform || 'unknown';
            badge.textContent = platform.toUpperCase();
            badge.className = \`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${
                platform === 'linkedin' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-sky-100 text-sky-800'
            }\`;
            
            // Update title with scheduled time
            const titleEl = document.getElementById('edit-post-title');
            titleEl.textContent = \`Scheduled for \${event.start.toLocaleString()}\`;
            
            // Update character count
            updateCharCount();
            
            // Update buttons for view mode
            const saveBtn = document.getElementById('save-post-btn');
            const cancelBtn = document.querySelector('#edit-modal button[onclick="closeEditModal()"]');
            
            // Hide save button, show edit button instead
            saveBtn.style.display = 'none';
            
            // Add or update edit button
            let editBtn = document.getElementById('edit-scheduled-btn');
            if (!editBtn) {
                editBtn = document.createElement('button');
                editBtn.id = 'edit-scheduled-btn';
                editBtn.className = 'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors';
                saveBtn.parentElement.insertBefore(editBtn, saveBtn);
            }
            editBtn.textContent = 'Edit Post';
            editBtn.style.display = 'block';
            editBtn.onclick = () => enableEditMode();
            
            // Show modal
            document.getElementById('edit-modal').classList.remove('hidden');
        }
        
        // Enable edit mode for scheduled posts
        function enableEditMode() {
            const textarea = document.getElementById('edit-content');
            textarea.disabled = false;
            textarea.style.backgroundColor = 'white';
            textarea.focus();
            
            // Update modal title
            const modalTitle = document.querySelector('#edit-modal h3');
            modalTitle.textContent = 'Edit Scheduled Post';
            
            // Switch buttons
            document.getElementById('edit-scheduled-btn').style.display = 'none';
            document.getElementById('save-post-btn').style.display = 'block';
            
            // Update save button to handle scheduled post update
            const saveBtn = document.getElementById('save-post-btn');
            saveBtn.onclick = () => saveScheduledPost();
        }
        
        // Save scheduled post (this would need backend implementation)
        async function saveScheduledPost() {
            if (!currentViewingEvent) return;
            
            const content = document.getElementById('edit-content').value.trim();
            if (!content) {
                showNotification('Post content cannot be empty', 'error');
                return;
            }
            
            // For now, just show a notification
            // In production, you'd need to implement an API endpoint to update Postiz posts
            showNotification('Scheduled post editing is not yet implemented in the backend', 'info');
            
            // Update the event locally for now
            currentViewingEvent.extendedProps.content = content;
            
            closeEditModal();
        }
        
        // Add global variable for current viewing event
        let currentViewingEvent = null;

        // Edit post function
        function editPost(postId, event) {
            event.stopPropagation();
            event.preventDefault();
            
            const post = posts.find(p => p.id === postId);
            if (!post) {
                showNotification('Post not found', 'error');
                return;
            }
            
            currentEditingPost = post;
            
            // Update modal content
            document.getElementById('edit-content').value = post.content;
            document.getElementById('edit-post-title').textContent = post.title;
            
            const badge = document.getElementById('edit-platform-badge');
            badge.textContent = post.platform;
            badge.className = \`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${
                post.platform === 'LinkedIn' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-sky-100 text-sky-800'
            }\`;
            
            // Update character count
            updateCharCount();
            
            // Show modal
            document.getElementById('edit-modal').classList.remove('hidden');
            
            // Focus textarea
            setTimeout(() => {
                document.getElementById('edit-content').focus();
            }, 100);
        }

        // Close edit modal
        function closeEditModal() {
            document.getElementById('edit-modal').classList.add('hidden');
            currentEditingPost = null;
            currentViewingEvent = null;
            
            // Reset modal state
            const textarea = document.getElementById('edit-content');
            textarea.disabled = false;
            textarea.style.backgroundColor = 'white';
            
            // Reset buttons
            const saveBtn = document.getElementById('save-post-btn');
            const editBtn = document.getElementById('edit-scheduled-btn');
            
            saveBtn.style.display = 'block';
            saveBtn.onclick = () => savePost(); // Reset to normal save function
            
            if (editBtn) {
                editBtn.style.display = 'none';
            }
            
            // Reset modal title
            const modalTitle = document.querySelector('#edit-modal h3');
            modalTitle.textContent = 'Edit Post';
        }

        // Update character count
        function updateCharCount() {
            const textarea = document.getElementById('edit-content');
            const charCount = document.getElementById('char-count');
            charCount.textContent = textarea.value.length;
        }

        // Save post function
        async function savePost() {
            if (!currentEditingPost) return;
            
            const content = document.getElementById('edit-content').value.trim();
            if (!content) {
                showNotification('Post content cannot be empty', 'error');
                return;
            }
            
            const saveBtn = document.getElementById('save-post-btn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;
            
            try {
                const response = await fetch('/api/edit-post', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        postId: currentEditingPost.id,
                        content: content
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Update the post in our local array
                    currentEditingPost.content = content;
                    
                    // Re-render posts to show updated content
                    renderPosts(posts);
                    
                    // Close modal
                    closeEditModal();
                    
                    showNotification('Post updated successfully!', 'success');
                } else {
                    showNotification('Failed to update post: ' + result.error, 'error');
                }
            } catch (error) {
                showNotification('Error updating post: ' + error.message, 'error');
            } finally {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }
        }

        // Add event listener for character count update
        document.addEventListener('DOMContentLoaded', function() {
            const textarea = document.getElementById('edit-content');
            if (textarea) {
                textarea.addEventListener('input', updateCharCount);
            }
        });

        // Handle escape key to close modal
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !document.getElementById('edit-modal').classList.contains('hidden')) {
                closeEditModal();
            }
        });

        // Show notification
        function showNotification(message, type = 'info') {
            const notificationsContainer = document.getElementById('notifications');
            
            const notification = document.createElement('div');
            notification.className = \`mb-2 px-4 py-3 rounded-lg shadow-lg text-white max-w-sm \${
                type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
            }\`;
            
            notification.textContent = message;
            
            notificationsContainer.appendChild(notification);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    </script>

    <style>
        /* Additional styles for better UX */
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .draggable-post {
            transition: all 0.2s ease;
        }
        
        .draggable-post:hover {
            transform: translateY(-1px);
        }
        
        /* FullCalendar custom styles */
        .fc-event {
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        }
        
        .fc-event:hover {
            opacity: 0.9;
            transform: translateY(-1px);
            transition: all 0.2s ease;
        }
        
        .fc-daygrid-event {
            border-radius: 4px;
            margin: 1px;
            cursor: pointer;
        }
    </style>
</body>
</html>`;
};

/**
 * Start the visual calendar server
 */
export const startCalendarServer = async (): Promise<void> => {
  await initConfig();
  
  const server = Bun.serve({
    port: 3001,
    async fetch(req) {
      const url = new URL(req.url);
      
      // Handle API routes
      if (url.pathname === '/api/posts') {
        return handleGetPosts();
      }
      
      if (url.pathname === '/api/scheduled') {
        return handleGetScheduled();
      }
      
      if (url.pathname === '/api/schedule' && req.method === 'POST') {
        return handleSchedulePost(req);
      }
      
      if (url.pathname === '/api/edit-post' && req.method === 'POST') {
        return handleEditPost(req);
      }
      
      // Serve calendar HTML for all other routes
      if (url.pathname === '/' || url.pathname.startsWith('/calendar')) {
        return new Response(getCalendarHTML(), {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      return new Response('Not found', { status: 404 });
    }
  });

  console.log(`🌐 Visual calendar scheduler started at http://localhost:${server.port}`);
  console.log(`📅 Drag posts from the sidebar onto the calendar to schedule them!`);
  
  // Auto-open browser (optional)
  try {
    Bun.spawn(['open', `http://localhost:${server.port}`]);
  } catch (error) {
    // Browser opening failed - that's okay
  }
};

// Run if called directly
if (import.meta.main) {
  startCalendarServer().catch(console.error);
}
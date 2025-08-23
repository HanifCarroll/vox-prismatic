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
        dragRevertDuration: 0,
        drop: function(info) {
            const postId = info.draggedEl.dataset.postId;
            const post = posts.find(p => p.id === postId);
            
            if (post) {
                handleCalendarDrop(post, info);
            }
        },
        eventClick: function(info) {
            showEventDetails(info.event);
        },
        eventOverlap: function(stillEvent, movingEvent) {
            // Allow events to sit side by side in day view
            return true;
        },
        slotEventOverlap: true,
        selectOverlap: true
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
            console.log(`Adding ${result.data.length} scheduled posts to calendar`);
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
    
    postsCount.textContent = `(${posts.length})`;
    
    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>No posts ready to schedule</p>
                <p class="text-sm mt-1">Create and approve some posts first!</p>
            </div>
        `;
        return;
    }

    postsContainer.innerHTML = posts.map(post => `
        <div class="draggable-post cursor-move p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
             draggable="true"
             data-post-id="${post.id}"
             data-platform="${post.platform}"
             data-content="${encodeURIComponent(post.content)}">
            
            <div class="flex items-center mb-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    post.platform === 'LinkedIn' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-sky-100 text-sky-800'
                }">
                    ${post.platform}
                </span>
            </div>
            
            <h3 class="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                ${post.title}
            </h3>
            
            <p class="text-xs text-gray-600 line-clamp-3">
                ${post.content.substring(0, 120)}...
            </p>
            
            <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
                <div class="flex items-center">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 3V1a1 1 0 112 0v2h4V1a1 1 0 112 0v2h2a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2h2z"/>
                    </svg>
                    Drag to schedule
                </div>
                <button class="edit-post-btn text-blue-600 hover:text-blue-800 font-medium" 
                        data-post-id="${post.id}"
                        onclick="editPost('${post.id}', event)">
                    Edit
                </button>
            </div>
        </div>
    `).join('');

    // Add drag event listeners
    document.querySelectorAll('.draggable-post').forEach(el => {
        el.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', '');
            this.style.opacity = '0.5';
            
            // Store dragging state for calendar view-specific behavior
            window.isDraggingPost = true;
            window.draggingPostPlatform = this.dataset.platform;
        });
        
        el.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            window.isDraggingPost = false;
            window.draggingPostPlatform = null;
            
            // Clean up any drag indicators
            cleanupDragIndicators();
        });
    });
}

// Clean up drag indicators
function cleanupDragIndicators() {
    const timeIndicator = document.getElementById('drag-time-indicator');
    if (timeIndicator) {
        timeIndicator.remove();
    }
    
    const dragLine = document.getElementById('drag-time-line');
    if (dragLine) {
        dragLine.remove();
    }
}

// Create time indicator for drag preview
function createTimeIndicator(timeString) {
    cleanupDragIndicators();
    
    const indicator = document.createElement('div');
    indicator.id = 'drag-time-indicator';
    indicator.className = 'fixed z-50 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none';
    indicator.textContent = timeString;
    indicator.style.display = 'none';
    
    document.body.appendChild(indicator);
    return indicator;
}

// Create horizontal time line for week/day view
function createTimeLine(slotElement) {
    cleanupDragIndicators();
    
    const line = document.createElement('div');
    line.id = 'drag-time-line';
    line.className = 'absolute bg-blue-400 h-0.5 pointer-events-none z-40';
    line.style.left = '0';
    line.style.right = '0';
    
    slotElement.style.position = 'relative';
    slotElement.appendChild(line);
    
    return line;
}

// Round date to nearest 15-minute increment
function roundToQuarterHour(date) {
    const roundedDate = new Date(date);
    const minutes = roundedDate.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    roundedDate.setMinutes(roundedMinutes, 0, 0);
    return roundedDate;
}

// Handle different drop behaviors based on calendar view
async function handleCalendarDrop(post, info) {
    const view = calendar.view;
    const dropDate = info.date;
    
    if (view.type === 'dayGridMonth') {
        // Month view: Show time selection modal
        showTimeSelectionModal(post, dropDate);
    } else if (view.type === 'timeGridWeek' || view.type === 'timeGridDay') {
        // Week/Day view: Direct time-based scheduling with 15-minute increments
        const roundedDate = roundToQuarterHour(dropDate);
        schedulePost(post, roundedDate);
    }
}

// Show time selection modal for month view drops
function showTimeSelectionModal(post, date) {
    // Get existing posts for that day to show conflicts
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayEvents = calendar.getEvents().filter(event => {
        const eventDate = new Date(event.start);
        return eventDate >= dayStart && eventDate <= dayEnd;
    });
    
    // Generate time slot options
    const timeSlots = [];
    for (let hour = 7; hour <= 22; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const slotTime = new Date(date);
            slotTime.setHours(hour, minute, 0, 0);
            
            // Skip past times
            if (slotTime <= new Date()) continue;
            
            // Check for conflicts (same platform within 1 hour)
            const hasConflict = dayEvents.some(event => {
                const eventTime = new Date(event.start);
                const timeDiff = Math.abs(eventTime.getTime() - slotTime.getTime());
                const platformsMatch = event.extendedProps.platform?.toLowerCase() === post.platform.toLowerCase();
                return platformsMatch && timeDiff < 60 * 60 * 1000;
            });
            
            const timeString = slotTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            timeSlots.push({
                time: slotTime.toISOString(),
                display: timeString,
                hasConflict: hasConflict
            });
        }
    }
    
    // Create and show modal
    createTimeSelectionModal(post, date, timeSlots, dayEvents);
}

// Create time selection modal
function createTimeSelectionModal(post, date, timeSlots, dayEvents) {
    // Remove existing modal if present
    const existingModal = document.getElementById('time-selection-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'time-selection-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    const modalContent = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onclick="event.stopPropagation()">
            <div class="p-4 border-b flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900">Schedule for ${new Date(date).toLocaleDateString()}</h3>
                <button class="text-gray-400 hover:text-gray-600" onclick="document.getElementById('time-selection-modal').remove()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="p-4 flex-1 overflow-y-auto">
                <!-- Post Preview -->
                <div class="mb-6 p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center mb-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            post.platform === 'LinkedIn' ? 'bg-blue-100 text-blue-800' : 'bg-sky-100 text-sky-800'
                        }">
                            ${post.platform}
                        </span>
                        <span class="ml-2 font-medium text-gray-900">${post.title}</span>
                    </div>
                    <p class="text-sm text-gray-600">${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}</p>
                </div>
                
                <!-- Existing Posts for Day -->
                ${dayEvents.length > 0 ? `
                    <div class="mb-6">
                        <h4 class="font-medium text-gray-900 mb-2">Already scheduled for this day:</h4>
                        <div class="space-y-2">
                            ${dayEvents.map(event => `
                                <div class="flex items-center p-2 bg-gray-50 rounded text-sm">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                                        event.extendedProps.platform === 'linkedin' ? 'bg-blue-100 text-blue-800' : 'bg-sky-100 text-sky-800'
                                    }">
                                        ${event.extendedProps.platform?.toUpperCase() || 'Unknown'}
                                    </span>
                                    <span class="text-gray-600 mr-2">${new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <span class="text-gray-800">${event.title.substring(0, 50)}...</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Time Selection -->
                <div>
                    <h4 class="font-medium text-gray-900 mb-3">Select a time:</h4>
                    <div class="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                        ${timeSlots.map(slot => `
                            <button 
                                class="time-slot-btn p-2 text-sm border rounded-md transition-colors ${
                                    slot.hasConflict 
                                        ? 'border-red-200 bg-red-50 text-red-600 cursor-not-allowed' 
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                                }"
                                data-time="${slot.time}"
                                ${slot.hasConflict ? 'disabled title="Conflicts with existing post"' : ''}
                                onclick="schedulePostAtTime('${post.id}', '${slot.time}')"
                            >
                                ${slot.display}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.innerHTML = modalContent;
    document.body.appendChild(modal);
}

// Schedule post at specific time (called from modal)
async function schedulePostAtTime(postId, timeString) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    document.getElementById('time-selection-modal').remove();
    await schedulePost(post, timeString);
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

    showNotification(`Scheduling "${post.title.substring(0, 30)}..." for ${new Date(scheduledDate).toLocaleString()}`, 'info');

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
            showNotification(`Successfully scheduled "${post.title.substring(0, 30)}..."`, 'success');
            
            // Add event to calendar
            calendar.addEvent({
                id: post.id,
                title: `${post.platform.toUpperCase()}: ${post.title.substring(0, 40)}...`,
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
    badge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        platform === 'linkedin' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-sky-100 text-sky-800'
    }`;
    
    // Update title with scheduled time
    const titleEl = document.getElementById('edit-post-title');
    titleEl.textContent = `Scheduled for ${event.start.toLocaleString()}`;
    
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
    badge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        post.platform === 'LinkedIn' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-sky-100 text-sky-800'
    }`;
    
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
    notification.className = `mb-2 px-4 py-3 rounded-lg shadow-lg text-white max-w-sm ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
    }`;
    
    notification.textContent = message;
    
    notificationsContainer.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}
import { ref } from 'vue';

/**
 * Manage Reverb/Echo channel subscriptions and connection state.
 * @param {Object} options
 * @param {string|null|undefined} options.projectChannel
 * @param {string|null|undefined} options.userChannel
 * @param {(e:any)=>void} [options.onProgress]
 * @param {()=>void} [options.onCompleted]
 * @param {(e:any)=>void} [options.onFailed]
 * @param {()=>void} [options.onPostRegenerated]
 * @param {()=>void} [options.onReconnect]
 */
export const useRealtimeChannels = (options = {}) => {
  const isRealtimeUnavailable = ref(false);
  let hasSeenInitialConnection = false;
  let connectionReadyTimer = null;
  let reconnectReloadTimer = null;
  let connectionCleanup = null;

  const scheduleReconnectReload = () => {
    if (reconnectReloadTimer !== null) {
      return;
    }
    reconnectReloadTimer = window.setTimeout(() => {
      reconnectReloadTimer = null;
      if (typeof options.onReconnect === 'function') options.onReconnect();
    }, 500);
  };

  const init = () => {
    hasSeenInitialConnection = false;
    if (connectionReadyTimer !== null) {
      window.clearTimeout(connectionReadyTimer);
    }
    connectionReadyTimer = null;
    connectionCleanup = null;

    if (window.Echo && options.projectChannel) {
      window.Echo
        .private(options.projectChannel)
        .listen('.project.progress', (e) => options.onProgress && options.onProgress(e))
        .listen('.project.completed', () => options.onCompleted && options.onCompleted())
        .listen('.project.failed', (e) => options.onFailed && options.onFailed(e))
        .listen('.post.regenerated', () => options.onPostRegenerated && options.onPostRegenerated());
    }

    if (window.Echo && options.userChannel) {
      window.Echo
        .private(options.userChannel)
        .listen('.post.regenerated', () => options.onPostRegenerated && options.onPostRegenerated());
    }

    const registerConnectionListeners = () => {
      const connection = window.Echo?.connector?.pusher?.connection;
      if (!connection) {
        connectionReadyTimer = window.setTimeout(registerConnectionListeners, 500);
        return;
      }

      const handleConnected = () => {
        isRealtimeUnavailable.value = false;
        if (!hasSeenInitialConnection) {
          hasSeenInitialConnection = true;
          return;
        }
        scheduleReconnectReload();
      };

      const handleResumed = () => {
        isRealtimeUnavailable.value = false;
        scheduleReconnectReload();
      };

      const handleDown = () => {
        isRealtimeUnavailable.value = true;
      };

      const handleStateChange = (states) => {
        const nextState = states.current ?? connection.state;
        if ([ 'unavailable', 'disconnected', 'failed' ].includes(nextState)) {
          isRealtimeUnavailable.value = true;
        } else if (nextState === 'connected') {
          isRealtimeUnavailable.value = false;
        }
      };

      connection.bind('connected', handleConnected);
      connection.bind('resumed', handleResumed);
      connection.bind('disconnected', handleDown);
      connection.bind('unavailable', handleDown);
      connection.bind('failed', handleDown);
      connection.bind('state_change', handleStateChange);

      if (connection.state === 'connected') {
        hasSeenInitialConnection = true;
        isRealtimeUnavailable.value = false;
      } else if ([ 'unavailable', 'disconnected', 'failed' ].includes(connection.state)) {
        isRealtimeUnavailable.value = true;
      }

      connectionCleanup = () => {
        connection.unbind('connected', handleConnected);
        connection.unbind('resumed', handleResumed);
        connection.unbind('disconnected', handleDown);
        connection.unbind('unavailable', handleDown);
        connection.unbind('failed', handleDown);
        connection.unbind('state_change', handleStateChange);
        connectionCleanup = null;
      };
    };

    registerConnectionListeners();
  };

  const dispose = () => {
    if (connectionReadyTimer !== null) {
      window.clearTimeout(connectionReadyTimer);
    }
    if (connectionCleanup) {
      connectionCleanup();
    }
    if (reconnectReloadTimer !== null) {
      window.clearTimeout(reconnectReloadTimer);
    }
    if (window.Echo && options.projectChannel) {
      window.Echo.leave(options.projectChannel);
    }
    if (window.Echo && options.userChannel) {
      window.Echo.leave(options.userChannel);
    }
  };

  return { isRealtimeUnavailable, init, dispose };
};


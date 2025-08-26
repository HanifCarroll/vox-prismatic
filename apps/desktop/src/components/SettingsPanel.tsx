import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface AppConfig {
  web_app_url: string;
  api_key: string | null;
}

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [webAppUrl, setWebAppUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const currentConfig = await invoke<AppConfig>('get_config');
      setConfig(currentConfig);
      setWebAppUrl(currentConfig.web_app_url);
      setApiKey(currentConfig.api_key || '');
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await invoke('update_config', {
        web_app_url: webAppUrl,
        api_key: apiKey || null
      });
      console.log('Config updated successfully');
      onClose();
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    setSaving(true);
    try {
      const defaultConfig = await invoke<AppConfig>('reset_config');
      setWebAppUrl(defaultConfig.web_app_url);
      setApiKey(defaultConfig.api_key || '');
      console.log('Config reset to defaults');
    } catch (error) {
      console.error('Failed to reset config:', error);
      alert('Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">Loading settings...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Server URL
          </label>
          <input
            type="text"
            value={webAppUrl}
            onChange={(e) => setWebAppUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="http://localhost:3001"
          />
          <p className="text-xs text-gray-500 mt-1">
            The URL of your API server (usually localhost:3001)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key (Optional)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter API key if required"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          disabled={saving}
        >
          Reset to Defaults
        </Button>
        
        <div className="space-x-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <strong>Current endpoint:</strong><br />
        {webAppUrl}/api/transcribe
      </div>
    </Card>
  );
}
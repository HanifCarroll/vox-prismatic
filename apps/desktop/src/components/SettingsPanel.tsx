import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Server, Key, RotateCcw, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [showSuccess, setShowSuccess] = useState(false);

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
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
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
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <div className="text-center">
            <h3 className="font-medium text-gray-900">Settings Saved</h3>
            <p className="text-sm text-gray-500 mt-1">Configuration updated successfully</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Server className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 space-y-6">
        {/* API Server URL */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Server className="w-4 h-4" />
            <span>API Server URL</span>
          </label>
          <input
            type="text"
            value={webAppUrl}
            onChange={(e) => setWebAppUrl(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            placeholder="http://localhost:3001"
          />
          <p className="text-xs text-gray-500 flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>The URL of your API server (usually localhost:3001)</span>
          </p>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Key className="w-4 h-4" />
            <span>API Key</span>
            <span className="text-xs text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            placeholder="Enter API key if required"
          />
        </div>

        {/* Current Endpoint Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Current Endpoint</h4>
          <code className="text-sm text-blue-700 bg-blue-100/50 px-2 py-1 rounded-md break-all">
            {webAppUrl}/api/transcribe
          </code>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-8">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          disabled={saving}
          className="flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Defaults</span>
        </Button>
        
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={saveConfig} 
            disabled={saving}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
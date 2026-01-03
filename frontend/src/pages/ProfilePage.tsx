import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Mail, 
  LogOut, 
  Loader2,
  Check,
  Camera
} from 'lucide-react';
import { Layout, PageHeader } from '@/components/Layout';
import { Avatar, InputField } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { formatPhoneNumber, cn } from '@/utils';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    
    try {
      await api.updateProfile(formData);
      await refreshUser();
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Layout>
      <PageHeader
        title="Profile"
        description="Manage your account settings"
      />

      <div className="max-w-2xl space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <Check className="w-5 h-5" />
            {successMessage}
          </div>
        )}

        {/* Profile Card */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar 
                  src={user?.avatar} 
                  name={user?.name || user?.phoneNumber} 
                  size="xl" 
                />
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg hover:bg-primary-700 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-surface-900">
                  {user?.name || user?.displayName}
                </h2>
                <p className="text-surface-500">
                  {user?.phoneNumber && formatPhoneNumber(user.phoneNumber)}
                </p>
                {user?.isVerified && (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600 mt-1">
                    <Check className="w-4 h-4" />
                    Verified
                  </span>
                )}
              </div>
            </div>
            
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="btn-secondary"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Profile Form */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-xl">
              <Phone className="w-5 h-5 text-surface-400" />
              <div>
                <p className="text-sm text-surface-500">Phone Number</p>
                <p className="font-medium text-surface-900">
                  {user?.phoneNumber && formatPhoneNumber(user.phoneNumber)}
                </p>
              </div>
            </div>

            {isEditing ? (
              <>
                <InputField
                  label="Display Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                />
                
                <InputField
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                />

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: user?.name || '',
                        email: user?.email || '',
                      });
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn('btn-primary flex-1', isSaving && 'opacity-70')}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-xl">
                  <User className="w-5 h-5 text-surface-400" />
                  <div>
                    <p className="text-sm text-surface-500">Display Name</p>
                    <p className="font-medium text-surface-900">
                      {user?.name || 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-xl">
                  <Mail className="w-5 h-5 text-surface-400" />
                  <div>
                    <p className="text-sm text-surface-500">Email Address</p>
                    <p className="font-medium text-surface-900">
                      {user?.email || 'Not set'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preferences Card */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <div>
                <p className="font-medium text-surface-900">Default Currency</p>
                <p className="text-sm text-surface-500">Used for new bills</p>
              </div>
              <select className="input w-32">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <div>
                <p className="font-medium text-surface-900">SMS Notifications</p>
                <p className="text-sm text-surface-500">Receive payment reminders</p>
              </div>
              <ToggleSwitch defaultChecked />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-surface-900">Push Notifications</p>
                <p className="text-sm text-surface-500">Get notified about bill activity</p>
              </div>
              <ToggleSwitch defaultChecked />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card p-6 border-red-200">
          <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
          
          <div className="space-y-4">
            <button 
              onClick={handleLogout}
              className="btn-danger w-full"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
            
            <button className="w-full py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">
              Deactivate Account
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Simple Toggle Switch Component
function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <button
      onClick={() => setChecked(!checked)}
      className={cn(
        'w-11 h-6 rounded-full transition-colors relative',
        checked ? 'bg-primary-600' : 'bg-surface-200'
      )}
    >
      <span
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

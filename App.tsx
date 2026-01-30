
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, Booking, DayAvailability, MeetingPlace } from './types';
import { DEFAULT_AVAILABILITY, ICONS, DAYS_OF_WEEK } from './constants';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { generateBio, findNearbyPlaces } from './services/geminiService';

// --- Views ---

const DashboardView: React.FC<{ 
  user: UserProfile; 
  bookings: Booking[]; 
  onNavigate: (view: 'settings' | 'public') => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}> = ({ user, bookings, onNavigate, onConfirm, onCancel }) => {
  const upcoming = bookings.filter(b => b.status !== 'cancelled').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}</h1>
          <p className="text-gray-500">You have {upcoming.length} upcoming meetings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<ICONS.Settings className="w-4 h-4" />} onClick={() => onNavigate('settings')}>
            Settings
          </Button>
          <Button icon={<ICONS.ExternalLink className="w-4 h-4" />} onClick={() => onNavigate('public')}>
            View Public Page
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ICONS.Calendar className="text-indigo-600" /> Upcoming Meetings
          </h2>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
              No meetings scheduled yet. Share your link to get started!
            </div>
          ) : (
            upcoming.map(meeting => (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                      {meeting.visitorName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{meeting.visitorName}</h4>
                      <p className="text-sm text-gray-500">{meeting.visitorEmail}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><ICONS.Calendar className="w-3.5 h-3.5" /> {new Date(meeting.date).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><ICONS.Clock className="w-3.5 h-3.5" /> {meeting.time}</span>
                        <span className="flex items-center gap-1"><ICONS.MapPin className="w-3.5 h-3.5" /> {meeting.place.name}</span>
                      </div>
                      {meeting.place.mapUri && (
                        <a href={meeting.place.mapUri} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 mt-2 inline-block hover:underline">
                          View Directions on Maps →
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {meeting.status === 'pending' && (
                      <Button size="sm" variant="secondary" onClick={() => onConfirm(meeting.id)}>Confirm</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => onCancel(meeting.id)}>Cancel</Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <Card>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Share your booking link with others:</p>
              <div className="p-3 bg-gray-50 rounded border flex items-center justify-between overflow-hidden">
                <code className="text-xs text-indigo-600 truncate">syncmeet.app/#{user.id}</code>
                <Button size="sm" variant="ghost" onClick={() => {
                  navigator.clipboard.writeText(`syncmeet.app/#/${user.id}`);
                  alert('Link copied!');
                }}>
                  <ICONS.Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 italic">"I'd love to chat! Pick a time and real-world place that works for you here..."</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const SettingsView: React.FC<{ 
  user: UserProfile; 
  onSave: (user: UserProfile) => void; 
  onBack: () => void;
}> = ({ user, onSave, onBack }) => {
  const [profile, setProfile] = useState<UserProfile>(JSON.parse(JSON.stringify(user)));
  const [isGenerating, setIsGenerating] = useState(false);

  const handleToggleDay = (dayIndex: number) => {
    const updated = { ...profile };
    updated.availability[dayIndex].active = !updated.availability[dayIndex].active;
    setProfile(updated);
  };

  const handleTimeChange = (dayIndex: number, slotIndex: number, field: 'start' | 'end', val: string) => {
    const updated = { ...profile };
    updated.availability[dayIndex].slots[slotIndex][field] = val;
    setProfile(updated);
  };

  const handleAiBio = async () => {
    setIsGenerating(true);
    try {
      const bio = await generateBio(profile.name, profile.title, "professional networking, coffee chats");
      setProfile({ ...profile, bio });
    } finally {
      setIsGenerating(false);
    }
  };

  const addPlace = () => {
    const name = prompt('Place Name:');
    if (name) {
      setProfile({
        ...profile,
        preferredPlaces: [...profile.preferredPlaces, { 
          id: Date.now().toString(), 
          name, 
          address: 'Main Street', 
          type: 'Coffee' 
        }]
      });
    }
  };

  const removePlace = (id: string) => {
    setProfile({
      ...profile,
      preferredPlaces: profile.preferredPlaces.filter(p => p.id !== id)
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>Cancel</Button>
          <Button onClick={() => onSave(profile)}>Save Changes</Button>
        </div>
      </div>

      <Card title="Profile Information" subtitle="Update how others see you.">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={profile.name}
                onChange={e => setProfile({...profile, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={profile.title}
                onChange={e => setProfile({...profile, title: e.target.value})}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-indigo-600 h-6" 
                onClick={handleAiBio}
                isLoading={isGenerating}
                icon={<ICONS.Sparkles className="w-3 h-3" />}
              >
                AI Bio
              </Button>
            </div>
            <textarea 
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={profile.bio}
              onChange={e => setProfile({...profile, bio: e.target.value})}
            />
          </div>
        </div>
      </Card>

      <Card title="Meeting Availability" subtitle="Set your weekly recurring hours.">
        <div className="space-y-4">
          {profile.availability.map((day, idx) => (
            <div key={day.day} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg bg-gray-50 border gap-4">
              <div className="flex items-center gap-3 w-32">
                <input 
                  type="checkbox" 
                  checked={day.active} 
                  onChange={() => handleToggleDay(idx)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className={`font-medium ${day.active ? 'text-gray-900' : 'text-gray-400'}`}>{day.day}</span>
              </div>
              
              {day.active ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="time" 
                    className="px-2 py-1 border rounded"
                    value={day.slots[0].start}
                    onChange={e => handleTimeChange(idx, 0, 'start', e.target.value)}
                  />
                  <span>to</span>
                  <input 
                    type="time" 
                    className="px-2 py-1 border rounded"
                    value={day.slots[0].end}
                    onChange={e => handleTimeChange(idx, 0, 'end', e.target.value)}
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400">Unavailable</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card 
        title="Default Locations" 
        subtitle="Saved meeting spots for quick selection."
        actions={<Button size="sm" variant="secondary" onClick={addPlace}>Add Spot</Button>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profile.preferredPlaces.map(place => (
            <div key={place.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                  <ICONS.MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{place.name}</p>
                  <p className="text-xs text-gray-500">{place.type}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removePlace(place.id)}>
                <ICONS.Trash className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const PublicBookingView: React.FC<{ 
  user: UserProfile; 
  onBook: (data: Partial<Booking>) => void;
  onClose: () => void;
}> = ({ user, onBook, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'Coffee' | 'Lunch' | 'Dinner'>('Coffee');
  const [suggestedPlaces, setSuggestedPlaces] = useState<MeetingPlace[]>(user.preferredPlaces);
  const [selectedPlace, setSelectedPlace] = useState<MeetingPlace>(user.preferredPlaces[0]);
  const [isSearching, setIsSearching] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', notes: '' });
  const [step, setStep] = useState(1);

  const dayOfWeek = DAYS_OF_WEEK[(new Date(selectedDate).getDay() + 6) % 7];
  const availability = user.availability.find(a => a.day === dayOfWeek);

  const generateTimeSlots = () => {
    if (!availability || !availability.active) return [];
    const slots = [];
    const start = parseInt(availability.slots[0].start.split(':')[0]);
    const end = parseInt(availability.slots[0].end.split(':')[0]);
    for (let i = start; i < end; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
      slots.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const handleSearchPlaces = async () => {
    setIsSearching(true);
    try {
      // Get real location if available
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const places = await findNearbyPlaces(selectedCategory, { 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude 
        });
        setSuggestedPlaces(places);
        if (places.length > 0) setSelectedPlace(places[0]);
        setIsSearching(false);
      }, async (err) => {
        // Fallback to a default location if geolocation fails
        const places = await findNearbyPlaces(selectedCategory, { lat: 37.7749, lng: -122.4194 }); // SF
        setSuggestedPlaces(places);
        if (places.length > 0) setSelectedPlace(places[0]);
        setIsSearching(false);
      });
    } catch (error) {
      console.error(error);
      setIsSearching(false);
    }
  };

  const handleBookingSubmit = () => {
    onBook({
      visitorName: form.name,
      visitorEmail: form.email,
      date: selectedDate,
      time: selectedTime,
      place: selectedPlace,
      notes: form.notes
    });
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:py-12 px-4 animate-in fade-in duration-700">
      <div className="max-w-5xl mx-auto w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        
        {/* Sidebar Profile */}
        <div className="w-full md:w-1/3 bg-indigo-700 p-8 text-white flex flex-col items-center md:items-start text-center md:text-left">
          <button onClick={onClose} className="self-start mb-8 text-indigo-200 hover:text-white flex items-center gap-1 text-sm font-medium">
            ← Exit Preview
          </button>
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur mb-6 flex items-center justify-center text-3xl font-bold shadow-lg overflow-hidden border-2 border-white/30">
            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0)}
          </div>
          <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
          <p className="text-indigo-200 text-sm mb-4 font-medium uppercase tracking-wider">{user.title}</p>
          <p className="text-indigo-50 text-sm leading-relaxed opacity-90">{user.bio}</p>
          
          <div className="mt-auto pt-8 w-full border-t border-indigo-500/50 space-y-4">
            <div className="flex items-center gap-3 text-sm text-indigo-100">
              <ICONS.Clock className="w-4 h-4" /> <span>Flexible session length</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-indigo-100">
              <ICONS.MapPin className="w-4 h-4" /> <span>Grounded real-world locations</span>
            </div>
          </div>
        </div>

        {/* Booking Interface */}
        <div className="w-full md:w-2/3 p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Schedule a Meeting</h3>
                <p className="text-gray-500 text-sm">Pick a time that works for your schedule.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">1. Choose Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                  {!availability?.active && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      Not available on {dayOfWeek}s.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">2. Choose Time</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {generateTimeSlots().map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                          selectedTime === slot ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                    {generateTimeSlots().length === 0 && (
                      <div className="col-span-2 py-8 text-center text-gray-400 text-sm italic border rounded-xl border-dashed">
                        No slots available.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t flex justify-end">
                <Button size="lg" disabled={!selectedTime || !selectedDate} onClick={() => setStep(2)}>
                  Next: Meeting Place
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <h3 className="text-2xl font-bold text-gray-900">Choose a Venue</h3>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Meeting Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Coffee', 'Lunch', 'Dinner'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          selectedCategory === cat ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-transparent text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        <span className="text-lg mb-1">
                          {cat === 'Coffee' ? '☕' : cat === 'Lunch' ? '🍱' : '🍽️'}
                        </span>
                        <span className="text-xs font-bold">{cat}</span>
                      </button>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4 bg-white shadow-sm"
                    onClick={handleSearchPlaces}
                    isLoading={isSearching}
                    icon={<ICONS.Sparkles className="w-3.5 h-3.5" />}
                  >
                    Search Real-World Nearby Places
                  </Button>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Select Venue</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {suggestedPlaces.map(place => (
                      <button
                        key={place.id}
                        onClick={() => setSelectedPlace(place)}
                        className={`w-full flex items-start gap-4 p-4 border-2 rounded-xl transition-all text-left ${
                          selectedPlace.id === place.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${selectedPlace.id === place.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          <ICONS.MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-900 leading-tight">{place.name}</h4>
                            {place.mapUri && (
                              <a href={place.mapUri} target="_blank" rel="noreferrer" className="text-indigo-600 text-xs hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                Map <ICONS.ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{place.address}</p>
                          {place.snippet && <p className="text-[10px] text-gray-400 italic line-clamp-1">{place.snippet}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" placeholder="Your Name" required
                    className="px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  />
                  <input 
                    type="email" placeholder="Your Email" required
                    className="px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-6 border-t flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><ICONS.Calendar className="w-3 h-3" /> {selectedDate}</span>
                  <span className="flex items-center gap-1"><ICONS.Clock className="w-3 h-3" /> {selectedTime}</span>
                </div>
                <Button 
                  size="lg" 
                  disabled={!form.name || !form.email || !selectedPlace} 
                  onClick={handleBookingSubmit}
                >
                  Book Meeting
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-500 px-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-inner">
                <ICONS.Check className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-extrabold text-gray-900 leading-tight">It's Official!</h3>
              <p className="text-gray-600 text-lg">
                Meeting scheduled with {user.name} at <strong>{selectedPlace.name}</strong> on <strong>{new Date(selectedDate).toLocaleDateString()}</strong> at <strong>{selectedTime}</strong>.
              </p>
              <div className="bg-indigo-50 p-4 rounded-xl text-left w-full max-w-sm mt-4 border border-indigo-100">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-1">Practical Tip</p>
                <p className="text-xs text-indigo-600 leading-snug">The location is grounded in real geography. An email invitation with the Google Maps link has been sent to {form.email}.</p>
              </div>
              <div className="pt-8">
                <Button variant="secondary" size="lg" onClick={onClose} className="px-12 shadow-sm">Got it</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'settings' | 'public'>('dashboard');
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('syncmeet_user');
    return saved ? JSON.parse(saved) : {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      name: 'Alex Rivera',
      title: 'Senior Product Designer',
      bio: 'Lover of clean UI and strong coffee. Always happy to chat about design, tech, and creative ideas.',
      avatar: 'https://picsum.photos/seed/alex/200',
      availability: DEFAULT_AVAILABILITY,
      preferredPlaces: [
        { id: '1', name: 'Standard Coffee Co', address: '123 Main St, Downtown', type: 'Coffee', snippet: 'A quiet place perfect for focused sessions.' },
        { id: '2', name: 'The Meeting Room', address: 'Virtual', type: 'Virtual', snippet: 'Best for remote-first catchups.' }
      ]
    };
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('syncmeet_bookings');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('syncmeet_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('syncmeet_bookings', JSON.stringify(bookings));
  }, [bookings]);

  const handleBooking = (bookingData: Partial<Booking>) => {
    const newBooking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      hostId: user.id,
      visitorName: bookingData.visitorName || 'Guest',
      visitorEmail: bookingData.visitorEmail || 'guest@example.com',
      date: bookingData.date || new Date().toISOString(),
      time: bookingData.time || '10:00',
      place: bookingData.place || user.preferredPlaces[0],
      notes: bookingData.notes || '',
      status: 'pending'
    };
    setBookings(prev => [...prev, newBooking]);
  };

  const confirmMeeting = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
  };

  const cancelMeeting = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  };

  const saveSettings = (updated: UserProfile) => {
    setUser(updated);
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {view === 'public' ? (
        <PublicBookingView user={user} onBook={handleBooking} onClose={() => setView('dashboard')} />
      ) : (
        <div className="flex-1 max-w-6xl mx-auto py-12 px-4 md:px-8 w-full">
          <nav className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
              <div className="bg-indigo-700 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
                <ICONS.Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-gray-900 block leading-none">SyncMeet</span>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">Pro Scheduler</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right mr-2">
                <p className="text-sm font-bold text-gray-900 leading-tight">{user.name}</p>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{user.title}</p>
              </div>
              <div className="h-10 w-10 rounded-xl border-2 border-indigo-100 overflow-hidden shadow-sm ring-4 ring-white">
                <img src={user.avatar} className="w-full h-full object-cover" />
              </div>
            </div>
          </nav>

          {view === 'dashboard' ? (
            <DashboardView 
              user={user} 
              bookings={bookings} 
              onNavigate={setView} 
              onConfirm={confirmMeeting}
              onCancel={cancelMeeting}
            />
          ) : (
            <SettingsView user={user} onSave={saveSettings} onBack={() => setView('dashboard')} />
          )}
        </div>
      )}

      {/* Persistence Notice for Demo */}
      <footer className="py-8 text-center text-gray-400 text-[10px] font-medium uppercase tracking-widest">
        <p>&copy; 2024 SyncMeet Grounded Scheduling. Built for professionals.</p>
      </footer>
    </div>
  );
};

export default App;

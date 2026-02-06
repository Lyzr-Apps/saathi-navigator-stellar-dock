'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  MessageCircle,
  Calendar,
  FileText,
  History,
  User,
  Send,
  Image as ImageIcon,
  X,
  Search,
  Filter,
  Plus,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Moon,
  Sun,
  Globe,
  Menu,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// Agent Configuration
const AGENT_ID = '6985a9d6301c62c7ca2c7e40'

// TypeScript Interfaces based on actual agent response
interface AgentResponse {
  status: 'success' | 'error'
  result: {
    message: string
    sessions?: Session[]
    calendar_events?: CalendarEvent[]
    conflicts?: Conflict[]
    notes?: Note[]
    venue_directions?: VenueDirections
    action_prompt?: string
  }
  metadata: {
    agent_name: string
    timestamp: string
    language: string
  }
}

interface Session {
  title: string
  time: string
  venue: string
  track: string
  speakers: string
  description?: string
}

interface CalendarEvent {
  id: string
  sessionId?: string
  title: string
  date: string
  startTime: string
  endTime: string
  venue?: string
  track?: string
}

interface Conflict {
  event1: CalendarEvent
  event2: CalendarEvent
  message: string
}

interface Note {
  id: string
  title: string
  content: string
  category: 'All' | 'Sessions' | 'Ideas' | 'Contacts' | 'Custom'
  timestamp: string
}

interface VenueDirections {
  location: string
  floor: string
  directions: string
  landmarks: string
  estimated_time: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sessions?: Session[]
  conflicts?: Conflict[]
  action_prompt?: string
}

interface ChatHistory {
  id: string
  preview: string
  timestamp: string
  messageCount: number
  messages: ChatMessage[]
}

export default function Home() {
  // Navigation State
  const [activeScreen, setActiveScreen] = useState<'chat' | 'sessions' | 'notes' | 'history' | 'profile'>('chat')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<{ file: File; preview: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sessions State
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDay, setFilterDay] = useState<string>('all')
  const [filterTrack, setFilterTrack] = useState<string>('all')
  const [filterTime, setFilterTime] = useState<string>('all')
  const [sessionDetailModal, setSessionDetailModal] = useState<Session | null>(null)
  const [sessionsView, setSessionsView] = useState<'all' | 'my-calendar'>('all')

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])

  // Notes State
  const [notes, setNotes] = useState<Note[]>([])
  const [notesCategory, setNotesCategory] = useState<'All' | 'Sessions' | 'Ideas' | 'Contacts' | 'Custom'>('All')
  const [noteDetailModal, setNoteDetailModal] = useState<Note | null>(null)
  const [editingNote, setEditingNote] = useState(false)
  const [editNoteTitle, setEditNoteTitle] = useState('')
  const [editNoteContent, setEditNoteContent] = useState('')

  // History State
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])

  // Profile State
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('user@example.com')
  const [language, setLanguage] = useState<'english' | 'hindi'>('english')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Initialize dark mode
  useEffect(() => {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDarkMode(false)
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load initial data
  useEffect(() => {
    // Load sample sessions data
    const sampleSessions: Session[] = [
      {
        title: 'AI in Healthcare: Transforming Patient Care',
        time: 'February 17, 2026, 10:00 AM - 11:00 AM',
        venue: 'Hall A, Ground Floor',
        track: 'Healthcare Innovations',
        speakers: 'Dr. A. Sharma, Prof. N. Kumar',
        description: 'Explore how AI is revolutionizing healthcare delivery and patient outcomes.'
      },
      {
        title: 'Future of AI in Medicine',
        time: 'February 18, 2026, 2:00 PM - 3:30 PM',
        venue: 'Conference Room B, First Floor',
        track: 'AI and Medicine',
        speakers: 'Dr. R. Verma, Dr. M. Singh',
        description: 'A deep dive into AI applications in medical diagnostics and treatment.'
      }
    ]
    setAllSessions(sampleSessions)
  }, [])

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !uploadedImage) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      let assetIds: string[] = []

      // Upload image if present
      if (uploadedImage) {
        const uploadResult = await uploadFiles(uploadedImage.file)
        if (uploadResult.success) {
          assetIds = uploadResult.asset_ids
        }
        setUploadedImage(null)
      }

      // Call agent
      const result = await callAIAgent(inputMessage, AGENT_ID, { assets: assetIds })

      if (result.success && result.response.status === 'success') {
        const agentData = result.response.result as AgentResponse['result']

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: agentData.message || 'Response received.',
          timestamp: new Date().toISOString(),
          sessions: agentData.sessions,
          conflicts: agentData.conflicts,
          action_prompt: agentData.action_prompt
        }

        setMessages(prev => [...prev, assistantMessage])

        // Update sessions if provided
        if (agentData.sessions && agentData.sessions.length > 0) {
          setAllSessions(prev => {
            const newSessions = agentData.sessions!.filter(
              newSession => !prev.some(existing => existing.title === newSession.title)
            )
            return [...prev, ...newSessions]
          })
        }

        // Update calendar events if provided
        if (agentData.calendar_events && agentData.calendar_events.length > 0) {
          setCalendarEvents(prev => [...prev, ...agentData.calendar_events!])
        }

        // Update notes if provided
        if (agentData.notes && agentData.notes.length > 0) {
          const formattedNotes: Note[] = agentData.notes.map(note => ({
            id: note.id || Math.random().toString(36).substr(2, 9),
            title: note.title || 'Untitled Note',
            content: note.content || '',
            category: 'All',
            timestamp: new Date().toISOString()
          }))
          setNotes(prev => [...prev, ...formattedNotes])
        }
      } else {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Network error. Please check your connection and try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input message change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value)
  }, [])

  // Handle search query change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  // Handle note title change
  const handleNoteTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditNoteTitle(e.target.value)
  }, [])

  // Handle note content change
  const handleNoteContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditNoteContent(e.target.value)
  }, [])

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const preview = URL.createObjectURL(file)
      setUploadedImage({ file, preview })
    }
  }, [])

  // Handle add to calendar
  const handleAddToCalendar = (session: Session) => {
    const newEvent: CalendarEvent = {
      id: Math.random().toString(36).substr(2, 9),
      title: session.title,
      date: session.time.split(',')[0],
      startTime: session.time.split(',')[1]?.split('-')[0]?.trim() || '',
      endTime: session.time.split(',')[1]?.split('-')[1]?.trim() || '',
      venue: session.venue,
      track: session.track
    }

    // Check for conflicts
    const conflict = calendarEvents.find(event => {
      // Simple overlap check (could be more sophisticated)
      return event.date === newEvent.date
    })

    if (conflict) {
      // Show conflict warning but still add
      setCalendarEvents(prev => [...prev, newEvent])
    } else {
      setCalendarEvents(prev => [...prev, newEvent])
    }
  }

  // Handle save note
  const handleSaveNote = () => {
    if (noteDetailModal && editingNote) {
      setNotes(prev => prev.map(note =>
        note.id === noteDetailModal.id
          ? { ...note, title: editNoteTitle, content: editNoteContent }
          : note
      ))
      setEditingNote(false)
      setNoteDetailModal(null)
    }
  }

  // Handle delete note
  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id))
    setNoteDetailModal(null)
  }

  // Filter sessions
  const filteredSessions = allSessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.speakers.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDay = filterDay === 'all' || session.time.includes(filterDay)
    const matchesTrack = filterTrack === 'all' || session.track === filterTrack

    return matchesSearch && matchesDay && matchesTrack
  })

  // Filter notes
  const filteredNotes = notesCategory === 'All'
    ? notes
    : notes.filter(note => note.category === notesCategory)

  // Get unique tracks
  const tracks = Array.from(new Set(allSessions.map(s => s.track)))

  // Navigation Component
  const NavigationSidebar = () => (
    <div className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col h-screen`}>
      {/* Logo Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3">
            <img src="https://asset.lyzr.app/kpkE1T1X" alt="Logo" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="font-bold text-lg text-gray-900 dark:text-white">Impact Saathi</h1>
              <p className="text-xs text-gray-500">AI Summit India 2026</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        <NavItem
          icon={<MessageCircle className="w-5 h-5" />}
          label="Chat"
          active={activeScreen === 'chat'}
          onClick={() => setActiveScreen('chat')}
          collapsed={sidebarCollapsed}
        />
        <NavItem
          icon={<Calendar className="w-5 h-5" />}
          label="Sessions"
          active={activeScreen === 'sessions'}
          onClick={() => setActiveScreen('sessions')}
          collapsed={sidebarCollapsed}
        />
        <NavItem
          icon={<FileText className="w-5 h-5" />}
          label="Notes"
          active={activeScreen === 'notes'}
          onClick={() => setActiveScreen('notes')}
          collapsed={sidebarCollapsed}
          badge={notes.length}
        />
        <NavItem
          icon={<History className="w-5 h-5" />}
          label="History"
          active={activeScreen === 'history'}
          onClick={() => setActiveScreen('history')}
          collapsed={sidebarCollapsed}
        />
        <NavItem
          icon={<User className="w-5 h-5" />}
          label="Profile"
          active={activeScreen === 'profile'}
          onClick={() => setActiveScreen('profile')}
          collapsed={sidebarCollapsed}
        />
      </nav>
    </div>
  )

  const NavItem = ({ icon, label, active, onClick, collapsed, badge }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        active
          ? 'bg-[#FF6B35] text-white'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
      {!collapsed && (
        <>
          <span className="font-medium">{label}</span>
          {badge !== undefined && badge > 0 && (
            <Badge className="ml-auto bg-[#4A90E2]">{badge}</Badge>
          )}
        </>
      )}
    </button>
  )

  // Mobile Bottom Navigation
  const MobileBottomNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
      <div className="flex justify-around items-center h-16">
        <MobileNavItem icon={<MessageCircle />} label="Chat" active={activeScreen === 'chat'} onClick={() => setActiveScreen('chat')} />
        <MobileNavItem icon={<Calendar />} label="Sessions" active={activeScreen === 'sessions'} onClick={() => setActiveScreen('sessions')} />
        <MobileNavItem icon={<FileText />} label="Notes" active={activeScreen === 'notes'} onClick={() => setActiveScreen('notes')} badge={notes.length} />
        <MobileNavItem icon={<History />} label="History" active={activeScreen === 'history'} onClick={() => setActiveScreen('history')} />
        <MobileNavItem icon={<User />} label="Profile" active={activeScreen === 'profile'} onClick={() => setActiveScreen('profile')} />
      </div>
    </div>
  )

  const MobileNavItem = ({ icon, label, active, onClick, badge }: any) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-2 relative ${
        active ? 'text-[#FF6B35]' : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-0 right-2 bg-[#4A90E2] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )

  // Chat Screen
  const ChatScreen = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="https://asset.lyzr.app/kpkE1T1X" />
            <AvatarFallback>IS</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Impact Saathi</h2>
            <p className="text-xs text-gray-500">Your AI Summit Assistant</p>
          </div>
        </div>
        <Avatar>
          <AvatarFallback className="bg-[#FF6B35] text-white">{userName[0]}</AvatarFallback>
        </Avatar>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <img src="https://asset.lyzr.app/exM1Mccv" alt="AI Impact Summit India" className="w-64 h-auto mb-6 rounded-lg shadow-lg" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Impact Saathi!</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              Ask me about sessions, speakers, venues, or anything about the India AI Summit 2026. I can help you manage your schedule, take notes, and navigate the event.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-lg">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setInputMessage('Show me AI Healthcare sessions')}>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">Show me AI Healthcare sessions</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setInputMessage('What is my schedule for Day 1?')}>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">What is my schedule for Day 1?</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-[#FF6B35] text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'} rounded-lg p-4 shadow-md`}>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              {/* Session Cards */}
              {msg.sessions && msg.sessions.length > 0 && (
                <div className="mt-4 space-y-2">
                  {msg.sessions.map((session, sessionIdx) => (
                    <Card key={sessionIdx} className="bg-gray-50 dark:bg-gray-900">
                      <CardContent className="p-3">
                        <h4 className="font-bold text-sm mb-1">{session.title}</h4>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>{session.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            <span>{session.venue}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            <span>{session.speakers}</span>
                          </div>
                        </div>
                        <Badge className="mt-2 bg-[#4A90E2]">{session.track}</Badge>
                        <Button
                          size="sm"
                          className="mt-2 w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                          onClick={() => handleAddToCalendar(session)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add to Calendar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Conflicts Warning */}
              {msg.conflicts && msg.conflicts.length > 0 && (
                <Alert className="mt-4 bg-yellow-50 border-yellow-400">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Schedule conflict detected! Check your calendar.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Prompt */}
              {msg.action_prompt && (
                <p className="mt-3 text-xs opacity-80 italic">{msg.action_prompt}</p>
              )}

              <p className="text-xs opacity-60 mt-2">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Impact Saathi is typing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
        {uploadedImage && (
          <div className="mb-2 relative inline-block">
            <img src={uploadedImage.preview} alt="Upload preview" className="w-20 h-20 rounded-lg object-cover" />
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
              onClick={() => {
                URL.revokeObjectURL(uploadedImage.preview)
                setUploadedImage(null)
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <ImageIcon className="w-5 h-5" />
          </Button>
          <Input
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Ask about sessions, speakers, venues..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || (!inputMessage.trim() && !uploadedImage)}
            className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )

  // Sessions Screen
  const SessionsScreen = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sessions</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search sessions, speakers..."
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={filterDay} onValueChange={setFilterDay}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              <SelectItem value="17">Day 1 (17th)</SelectItem>
              <SelectItem value="18">Day 2 (18th)</SelectItem>
              <SelectItem value="19">Day 3 (19th)</SelectItem>
              <SelectItem value="20">Day 4 (20th)</SelectItem>
              <SelectItem value="21">Day 5 (21st)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterTrack} onValueChange={setFilterTrack}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Track" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              {tracks.map(track => (
                <SelectItem key={track} value={track}>{track}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filterDay !== 'all' || filterTrack !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterDay('all')
                setFilterTrack('all')
                setFilterTime('all')
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* View Toggle */}
        <Tabs value={sessionsView} onValueChange={(v: any) => setSessionsView(v)}>
          <TabsList>
            <TabsTrigger value="all">All Sessions</TabsTrigger>
            <TabsTrigger value="my-calendar">My Calendar ({calendarEvents.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Sessions Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {sessionsView === 'all' ? (
          filteredSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSessions.map((session, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSessionDetailModal(session)}>
                  <CardHeader>
                    <CardTitle className="text-lg">{session.title}</CardTitle>
                    <CardDescription>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{session.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4" />
                          <span>{session.venue}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4" />
                          <span>{session.speakers}</span>
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-[#4A90E2]">{session.track}</Badge>
                      <Button
                        size="sm"
                        className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToCalendar(session)
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No sessions found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
            </div>
          )
        ) : (
          calendarEvents.length > 0 ? (
            <div className="space-y-4">
              {calendarEvents.map((event, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>{event.venue}</span>
                          </div>
                        )}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {event.track && <Badge className="bg-[#4A90E2]">{event.track}</Badge>}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setCalendarEvents(prev => prev.filter(e => e.id !== event.id))}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No events scheduled</h3>
              <p className="text-gray-600 dark:text-gray-400">Add sessions to your calendar to see them here</p>
            </div>
          )
        )}
      </div>
    </div>
  )

  // Notes Screen
  const NotesScreen = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Notes</h2>

        {/* Category Tabs */}
        <Tabs value={notesCategory} onValueChange={(v: any) => setNotesCategory(v)}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="All">All</TabsTrigger>
            <TabsTrigger value="Sessions">Sessions</TabsTrigger>
            <TabsTrigger value="Ideas">Ideas</TabsTrigger>
            <TabsTrigger value="Contacts">Contacts</TabsTrigger>
            <TabsTrigger value="Custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                setNoteDetailModal(note)
                setEditNoteTitle(note.title)
                setEditNoteContent(note.content)
              }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">{note.title}</CardTitle>
                    <Badge variant="outline">{note.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{note.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(note.timestamp).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notes yet</h3>
            <p className="text-gray-600 dark:text-gray-400">Ask Saathi to save something for you!</p>
          </div>
        )}
      </div>
    </div>
  )

  // History Screen
  const HistoryScreen = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Conversation History</h2>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-4">
        {chatHistories.length > 0 ? (
          <div className="space-y-4">
            {chatHistories.map((history) => (
              <Card key={history.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">{history.preview}</CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm">{history.messageCount} messages</span>
                      <span className="text-sm">{new Date(history.timestamp).toLocaleString()}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                      onClick={() => {
                        setMessages(history.messages)
                        setActiveScreen('chat')
                      }}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setChatHistories(prev => prev.filter(h => h.id !== history.id))}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <History className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No conversation history</h3>
            <p className="text-gray-600 dark:text-gray-400">Start chatting with Impact Saathi to build your history</p>
          </div>
        )}
      </div>
    </div>
  )

  // Profile Screen
  const ProfileScreen = () => {
    const summitStartDate = new Date('2026-02-17')
    const today = new Date()
    const daysRemaining = Math.ceil((summitStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h2>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* User Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarFallback className="bg-[#FF6B35] text-white text-2xl">{userName[0]}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{userName}</h3>
                <p className="text-gray-600 dark:text-gray-400">{userEmail}</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-[#FF6B35]" />
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{calendarEvents.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sessions Scheduled</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-[#4A90E2]" />
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{notes.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Notes Saved</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{daysRemaining}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Days Remaining</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Language Preference
                </Label>
                <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi (हिंदी)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Theme */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  Theme
                </Label>
                <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Summit Info */}
          <Card className="bg-gradient-to-r from-[#FF6B35] to-[#4A90E2] text-white">
            <CardContent className="pt-6">
              <h3 className="text-xl font-bold mb-2">India AI Summit 2026</h3>
              <p className="text-sm mb-4">February 17-21, 2026</p>
              <img
                src="https://asset.lyzr.app/exM1Mccv"
                alt="AI Impact Summit India"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Session Detail Modal
  const SessionDetailModalComponent = () => (
    <Dialog open={!!sessionDetailModal} onOpenChange={(open) => !open && setSessionDetailModal(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{sessionDetailModal?.title}</DialogTitle>
          <DialogDescription>
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{sessionDetailModal?.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{sessionDetailModal?.venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{sessionDetailModal?.speakers}</span>
              </div>
              <Badge className="bg-[#4A90E2]">{sessionDetailModal?.track}</Badge>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Description</h4>
          <p className="text-gray-600 dark:text-gray-400">{sessionDetailModal?.description || 'No description available.'}</p>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1 bg-[#FF6B35] hover:bg-[#FF6B35]/90"
            onClick={() => {
              if (sessionDetailModal) handleAddToCalendar(sessionDetailModal)
              setSessionDetailModal(null)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Calendar
          </Button>
          <Button variant="outline" onClick={() => setSessionDetailModal(null)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  // Note Detail Modal
  const NoteDetailModalComponent = () => (
    <Dialog open={!!noteDetailModal} onOpenChange={(open) => {
      if (!open) {
        setNoteDetailModal(null)
        setEditingNote(false)
      }
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingNote ? (
              <Input
                value={editNoteTitle}
                onChange={handleNoteTitleChange}
                className="font-semibold"
              />
            ) : (
              noteDetailModal?.title
            )}
          </DialogTitle>
          <DialogDescription>
            <Badge variant="outline">{noteDetailModal?.category}</Badge>
            <span className="ml-2 text-sm">{noteDetailModal && new Date(noteDetailModal.timestamp).toLocaleString()}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {editingNote ? (
            <Textarea
              value={editNoteContent}
              onChange={handleNoteContentChange}
              rows={10}
              className="w-full"
            />
          ) : (
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{noteDetailModal?.content}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          {editingNote ? (
            <>
              <Button
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                onClick={handleSaveNote}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditingNote(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                onClick={() => setEditingNote(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => noteDetailModal && handleDeleteNote(noteDetailModal.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button variant="outline" onClick={() => setNoteDetailModal(null)}>
                Close
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <NavigationSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        {activeScreen === 'chat' && <ChatScreen />}
        {activeScreen === 'sessions' && <SessionsScreen />}
        {activeScreen === 'notes' && <NotesScreen />}
        {activeScreen === 'history' && <HistoryScreen />}
        {activeScreen === 'profile' && <ProfileScreen />}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Modals */}
      <SessionDetailModalComponent />
      <NoteDetailModalComponent />
    </div>
  )
}

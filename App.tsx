
import React, { useState, useCallback, useMemo, FC, PropsWithChildren, useEffect } from 'react';
import { UserRole, Course, Submission, Assignment, Module, User } from './types';
import { generateCourse, evaluateSubmission, generateProgressReport, getAiStudyHelp, generateAdminPerformanceSummary } from './services/geminiService';
import { HomeIcon, BookOpenIcon, AcademicCapIcon, PlusCircleIcon, ArrowLeftIcon, UserCircleIcon, ChartBarIcon, SparklesIcon, UsersIcon, DocumentDuplicateIcon, TrashIcon, QuestionMarkCircleIcon, ArrowRightOnRectangleIcon, PencilIcon, CheckCircleIcon, XMarkIcon, Cog6ToothIcon, ClipboardDocumentListIcon } from './components/icons';

// --- Helper & UI Components ---

const Spinner: FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
);

const Card: FC<PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>> = ({ children, className = '', ...props }) => (
    <div className={`bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-all duration-300 ${className}`} {...props}>
        {children}
    </div>
);

// --- Notification Components ---

interface AppNotification {
  id: number;
  message: string;
  type: 'success';
}

const Notification: FC<{ notification: AppNotification, onDismiss: (id: number) => void }> = ({ notification, onDismiss }) => {
    const iconWrapperClasses = "inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg";
    let icon;

    switch (notification.type) {
        case 'success':
            icon = (
                <div className={`${iconWrapperClasses} bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200`}>
                    <CheckCircleIcon className="w-5 h-5" />
                </div>
            );
            break;
    }

    return (
        <div className="flex items-center p-4 w-full max-w-sm text-gray-500 bg-white rounded-lg shadow-lg dark:text-gray-400 dark:bg-slate-800" role="alert">
            {icon}
            <div className="ms-3 text-sm font-normal">{notification.message}</div>
            <button
                type="button"
                className="ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700"
                aria-label="Close"
                onClick={() => onDismiss(notification.id)}
            >
                <span className="sr-only">Close</span>
                <XMarkIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

const NotificationContainer: FC<{ notifications: AppNotification[], onDismiss: (id: number) => void }> = ({ notifications, onDismiss }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] w-full max-w-sm space-y-3">
            {notifications.map(n => (
                <Notification key={n.id} notification={n} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

// --- Login Component ---

const Login: FC<{ onLogin: (user: User) => void; users: User[] }> = ({ onLogin, users }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (user && user.password === password) {
            onLogin(user);
        } else if (!user) {
            setError('User not found. Check the username.');
        } else {
            setError('Invalid password.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <AcademicCapIcon className="h-16 w-16 text-primary-600 mx-auto" />
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight mt-4">AI-LMS Login</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Sign in to access your dashboard.</p>
                </div>
                <Card className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g., student, teacher, admin"
                                className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="password"
                                className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                            Sign In
                        </button>
                    </form>
                </Card>
            </div>
        </div>
    );
};


const LmsHeader: FC<{ user: User, onLogout: () => void, onEditProfile: () => void }> = ({ user, onLogout, onEditProfile }) => (
    <header className="bg-white dark:bg-slate-900/70 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
            <AcademicCapIcon className="h-8 w-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">AI-LMS</h1>
        </div>
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <UserCircleIcon className="h-6 w-6 text-slate-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                {user.username} ({user.role})
              </span>
            </div>
            {user.role !== UserRole.Administrator && (
              <button
                  onClick={onEditProfile}
                  className="p-1.5 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Edit Profile"
              >
                  <Cog6ToothIcon className="h-5 w-5" />
              </button>
            )}
            <button
                onClick={onLogout}
                className="flex items-center space-x-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                aria-label="Logout"
            >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span>Logout</span>
            </button>
        </div>
    </header>
);

const Sidebar: FC<{ view: string; setView: (view: string) => void; userRole: UserRole }> = ({ view, setView, userRole }) => {
    const navItems = useMemo(() => {
        const baseItems = [
            { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
            { id: 'courses', label: 'Courses', icon: BookOpenIcon },
        ];
        if (userRole === UserRole.Student) {
            baseItems.push({ id: 'grades', label: 'Progress', icon: ChartBarIcon });
        }
        if (userRole === UserRole.Teacher) {
            baseItems.push({ id: 'grades', label: 'Submissions', icon: ChartBarIcon });
        }
        if (userRole === UserRole.Administrator) {
            baseItems.push({ id: 'performance', label: 'Performance', icon: ClipboardDocumentListIcon });
            baseItems.push({ id: 'user-management', label: 'User Management', icon: UsersIcon });
        }
        return baseItems;
    }, [userRole]);

    return (
        <aside className="w-64 bg-white dark:bg-slate-900/70 backdrop-blur-lg border-r border-slate-200 dark:border-slate-800 p-4 flex-col hidden md:flex">
            <nav className="mt-8 flex-grow">
                <ul className="space-y-2">
                    {navItems.map(item => (
                        <li key={item.id}>
                            <button
                                onClick={() => setView(item.id)}
                                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-200 ${
                                    view === item.id 
                                        ? 'bg-primary-600 text-white shadow-lg' 
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <item.icon className="h-6 w-6" />
                                <span className="font-semibold">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

// --- View Components ---
const StatCard: FC<{ icon: React.ElementType, label: string, value: string | number, color: string }> = ({ icon: Icon, label, value, color }) => (
    <Card className="p-6 flex items-start space-x-4">
        <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{label}</h3>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{value}</p>
        </div>
    </Card>
);

const Dashboard = ({ loggedInUser, courses, submissions, users, setView, setSelectedCourseId } : {
    loggedInUser: User;
    courses: Course[];
    submissions: Submission[];
    users: User[];
    setView: (view: string) => void;
    setSelectedCourseId: (id: string) => void;
}) => {
    const studentCourses = useMemo(() => courses.filter(c => c.enrolledStudentIds.includes(loggedInUser.id)), [courses, loggedInUser.id]);
    const teacherCourses = useMemo(() => courses.filter(c => c.teacherId === loggedInUser.id), [courses, loggedInUser.id]);

    const summary = useMemo(() => {
        switch(loggedInUser.role) {
            case UserRole.Student: {
                const studentSubmissions = submissions.filter(s => s.studentId === loggedInUser.id);
                return {
                    title: `Welcome, ${loggedInUser.username}!`, message: "Your learning journey starts here. Let's make progress today!",
                    stats: [
                        { label: 'Enrolled Courses', value: studentCourses.length, icon: BookOpenIcon, color: 'bg-blue-500' },
                        { label: 'Submitted Work', value: studentSubmissions.length, icon: DocumentDuplicateIcon, color: 'bg-amber-500' },
                        { label: 'Graded Assignments', value: studentSubmissions.filter(s => s.grade !== null).length, icon: AcademicCapIcon, color: 'bg-green-500' },
                    ]
                };
            }
            case UserRole.Teacher: {
                 const teacherSubmissions = submissions.filter(s => s.teacherId === loggedInUser.id);
                 return {
                    title: "Teacher Dashboard", message: "Manage courses, evaluate submissions, and guide your students.",
                     stats: [
                        { label: 'Your Courses', value: teacherCourses.length, icon: BookOpenIcon, color: 'bg-blue-500' },
                        { label: 'Total Submissions', value: teacherSubmissions.length, icon: DocumentDuplicateIcon, color: 'bg-amber-500' },
                        { label: 'Awaiting Grading', value: teacherSubmissions.filter(s => s.grade === null).length, icon: SparklesIcon, color: 'bg-pink-500' },
                    ]
                };
            }
            case UserRole.Administrator:
                return {
                    title: "Admin Dashboard", message: "Oversee all platform activity from a bird's-eye view.",
                     stats: [
                        { label: 'Total Courses', value: courses.length, icon: BookOpenIcon, color: 'bg-blue-500' },
                        { label: 'Total Users', value: users.length, icon: UsersIcon, color: 'bg-purple-500' },
                        { label: 'Total Submissions', value: submissions.length, icon: DocumentDuplicateIcon, color: 'bg-amber-500' },
                    ]
                };
        }
    }, [loggedInUser, users, courses, studentCourses, teacherCourses, submissions]);

    const coursesToShow = useMemo(() => {
        switch (loggedInUser.role) {
            case UserRole.Student: return studentCourses;
            case UserRole.Teacher: return teacherCourses;
            case UserRole.Administrator: return courses;
            default: return [];
        }
    }, [loggedInUser.role, studentCourses, teacherCourses, courses]);


    return (
        <div className="p-4 md:p-8 space-y-8">
            <div>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{summary.title}</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{summary.message}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {summary.stats.map(stat => <StatCard key={stat.label} {...stat} />)}
            </div>

            <div>
                <h3 className="text-2xl font-bold tracking-tight mb-4">
                    {loggedInUser.role === UserRole.Student ? "Your Enrolled Courses" : "Courses"}
                </h3>
                {coursesToShow.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {coursesToShow.map(course => (
                            <Card key={course.id} className="p-6 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                                 onClick={() => { setSelectedCourseId(course.id); setView('course-detail'); }}>
                                <h4 className="font-bold text-lg text-primary-600 dark:text-primary-400 mb-2">{course.title}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{course.description}</p>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                        <BookOpenIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{loggedInUser.role === UserRole.Student ? "You are not enrolled in any courses." : "No courses have been created yet."}</h3>
                         {loggedInUser.role !== UserRole.Student && (
                            <button onClick={() => setView('create-course')} className="mt-4 bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                                Create a Course
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const CourseList = ({ courses, loggedInUser, setView, setSelectedCourseId, onEnroll, onUnenroll }: {
    courses: Course[]; loggedInUser: User; setView: (view: string) => void;
    setSelectedCourseId: (id: string) => void; onEnroll: (courseId: string) => void; onUnenroll: (courseId: string) => void;
}) => {
    const coursesToDisplay = useMemo(() => {
        if (loggedInUser.role === UserRole.Teacher) {
            return courses.filter(course => course.teacherId === loggedInUser.id);
        }
        return courses; // Students and Admins see all courses in this list view
    }, [courses, loggedInUser]);

    return (
    <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight">
                {loggedInUser.role === UserRole.Teacher ? "Your Courses" : "All Courses"}
            </h2>
            {loggedInUser.role !== UserRole.Student && (
                 <div className="flex items-center space-x-2">
                    <button onClick={() => setView('manual-create-course')} className="flex items-center space-x-2 bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors shadow-sm">
                        <PlusCircleIcon className="h-5 w-5" />
                        <span>Create Manually</span>
                    </button>
                    <button onClick={() => setView('create-course')} className="flex items-center space-x-2 bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
                        <SparklesIcon className="h-5 w-5" />
                        <span>Create with AI</span>
                    </button>
                </div>
            )}
        </div>
        {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursesToDisplay.map(course => {
                    const isEnrolled = course.enrolledStudentIds.includes(loggedInUser.id);
                    return (
                        <Card key={course.id} className="overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1">
                            <div className="p-6 flex-grow">
                                <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400 mb-2">{course.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3">{course.description}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <button onClick={() => { setSelectedCourseId(course.id); setView('course-detail'); }} className="text-sm font-semibold text-primary-600 hover:underline">
                                    View Details
                                </button>
                                {loggedInUser.role === UserRole.Student && (
                                    isEnrolled ? (
                                        <button onClick={() => onUnenroll(course.id)} className="text-sm font-semibold bg-red-500 text-white py-1.5 px-3 rounded-md hover:bg-red-600">
                                            Unenroll
                                        </button>
                                    ) : (
                                        <button onClick={() => onEnroll(course.id)} className="text-sm font-semibold bg-secondary-600 text-white py-1.5 px-3 rounded-md hover:bg-secondary-700">
                                            Enroll
                                        </button>
                                    )
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        ) : (
             <div className="text-center py-20 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                <BookOpenIcon className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">There are no available courses.</h3>
            </div>
        )}
    </div>
    )
};

const AdminCourseDetailView: FC<{
    course: Course;
    users: User[];
    setView: (view: string) => void;
    onDeleteCourse: (courseId: string) => void;
}> = ({ course, users, setView, onDeleteCourse }) => {
    const enrolledStudents = useMemo(() => users.filter(user => course.enrolledStudentIds.includes(user.id)), [users, course]);

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete the course "${course.title}"? This action cannot be undone.`)) {
            onDeleteCourse(course.id);
        }
    };

    return (
        <div className="p-4 md:p-8">
            <button onClick={() => setView('courses')} className="flex items-center space-x-2 text-primary-600 font-semibold mb-6 hover:underline">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Back to Courses</span>
            </button>
            <div className="flex justify-between items-start gap-4 mb-2">
                <h2 className="text-4xl font-extrabold tracking-tight">{course.title}</h2>
                <button onClick={handleDelete} className="flex-shrink-0 flex items-center space-x-2 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">
                    <TrashIcon className="h-5 w-5"/>
                    <span>Delete Course</span>
                </button>
            </div>
             <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-3xl">{course.description}</p>
            
            <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Enrolled Students ({enrolledStudents.length})</h3>
                {enrolledStudents.length > 0 ? (
                    <ul className="space-y-3">
                        {enrolledStudents.map(student => (
                            <li key={student.id} className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg">
                                <UserCircleIcon className="h-6 w-6 text-slate-500" />
                                <span className="font-medium capitalize">{student.username}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-500">No students are currently enrolled in this course.</p>
                )}
            </Card>
        </div>
    );
};

const CourseDetail = ({ course, submissions, loggedInUser, setView, onAssignmentSubmit, onShowStudyHelper, onEnroll, onDeleteCourse, users }: {
    course: Course | undefined; submissions: Submission[]; loggedInUser: User; setView: (view: string) => void;
    onAssignmentSubmit: (submission: Omit<Submission, 'id' | 'submittedAt' | 'grade' | 'feedback' | 'teacherId'>) => Promise<void>;
    onShowStudyHelper: (course: Course) => void;
    onEnroll: (courseId: string) => void;
    onDeleteCourse: (courseId: string) => void;
    users: User[];
}) => {
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [submissionContent, setSubmissionContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAssignment || !submissionContent || !course) return;

        setIsSubmitting(true); setError('');
        try {
            await onAssignmentSubmit({
                assignmentId: selectedAssignment.id, studentId: loggedInUser.id,
                courseId: course.id, content: submissionContent,
            });
            setSubmissionContent(''); setSelectedAssignment(null);
        } catch (err: any) { setError(err.message || "Failed to submit."); } 
        finally { setIsSubmitting(false); }
    };
    
    const handleDelete = () => {
        if (course && window.confirm(`Are you sure you want to delete the course "${course.title}"? This action cannot be undone.`)) {
            onDeleteCourse(course.id);
        }
    }

    if (!course) return <div className="p-8">Course not found.</div>;
    
    const isEnrolled = course.enrolledStudentIds.includes(loggedInUser.id);
    const userRole = loggedInUser.role;

    if (userRole === UserRole.Administrator) {
        return <AdminCourseDetailView course={course} users={users} setView={setView} onDeleteCourse={onDeleteCourse} />;
    }

    // Check if the teacher owns this course
    const canTeacherView = userRole !== UserRole.Teacher || course.teacherId === loggedInUser.id;

    if (!canTeacherView) {
        return (
            <div className="p-4 md:p-8">
                <button onClick={() => setView('courses')} className="flex items-center space-x-2 text-primary-600 font-semibold mb-6 hover:underline">
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span>Back to Courses</span>
                </button>
                <Card className="p-8 text-center">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p>You do not have permission to view this course.</p>
                </Card>
            </div>
        );
    }


    if (userRole === UserRole.Student && !isEnrolled) {
        return (
            <div className="p-4 md:p-8">
                 <button onClick={() => setView('courses')} className="flex items-center space-x-2 text-primary-600 font-semibold mb-6 hover:underline">
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span>Back to Courses</span>
                </button>
                 <Card className="p-8 text-center">
                    <AcademicCapIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">{course.title}</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">{course.description}</p>
                    <p className="font-semibold mb-4">You are not enrolled in this course.</p>
                    <button onClick={() => onEnroll(course.id)} className="bg-secondary-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-secondary-700 transition-colors">
                        Enroll Now
                    </button>
                 </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <button onClick={() => setView('courses')} className="flex items-center space-x-2 text-primary-600 font-semibold mb-6 hover:underline">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Back to Courses</span>
            </button>
            <div className="flex justify-between items-start gap-4 mb-2">
                <h2 className="text-4xl font-extrabold tracking-tight">{course.title}</h2>
                 <div className="flex items-center space-x-3">
                    {userRole === UserRole.Student && (
                        <button onClick={() => onShowStudyHelper(course)} className="flex-shrink-0 flex items-center space-x-2 bg-secondary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-secondary-700 transition-colors">
                            <QuestionMarkCircleIcon className="h-5 w-5"/>
                            <span>AI Study Assistant</span>
                        </button>
                    )}
                    {(userRole === UserRole.Teacher && course.teacherId === loggedInUser.id) && (
                        <button onClick={handleDelete} className="flex-shrink-0 flex items-center space-x-2 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">
                            <TrashIcon className="h-5 w-5"/>
                            <span>Delete Course</span>
                        </button>
                    )}
                </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-3xl">{course.description}</p>
            
            <div className="space-y-6">
                {course.modules.map(module => (
                    <Card key={module.id} className="p-6">
                        <h3 className="text-xl font-bold mb-2">{module.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">{module.description}</p>
                        
                        <details className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                            <summary className="font-semibold cursor-pointer">View Learning Content</summary>
                            <div className="prose prose-sm dark:prose-invert max-w-none mt-2 whitespace-pre-wrap">{module.content}</div>
                        </details>
                        
                        <div className="space-y-3 mt-4">
                            {module.assignments.map(assignment => {
                                const submission = submissions.find(s => s.assignmentId === assignment.id && s.studentId === loggedInUser.id);
                                return (
                                    <div key={assignment.id} className="p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="font-semibold">{assignment.title}</h4>
                                                {submission && <span className={`text-xs font-bold px-2 py-1 rounded-full mt-1 inline-block ${submission.grade !== null ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>{submission.grade !== null ? `Graded: ${submission.grade}/100` : 'Submitted'}</span>}
                                            </div>
                                            {userRole === UserRole.Student && !submission && (
                                                <button onClick={() => setSelectedAssignment(assignment)} className="bg-primary-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-primary-700">
                                                    Submit
                                                </button>
                                            )}
                                        </div>
                                        {submission && (
                                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                <p className="text-sm font-semibold">Your Submission:</p>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap p-3 bg-white dark:bg-slate-800 rounded mt-1">{submission.content}</p>
                                                {submission.feedback && (
                                                   <div className="mt-3">
                                                     <p className="text-sm font-semibold">Feedback:</p>
                                                     <p className="text-sm text-slate-700 dark:text-slate-300 p-3 bg-green-50 dark:bg-green-900/30 rounded mt-1">{submission.feedback}</p>
                                                   </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                ))}
            </div>

            {selectedAssignment && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
                    <Card className="p-8 w-full max-w-2xl" role="dialog" aria-modal="true">
                         <h3 className="text-2xl font-bold mb-2">{selectedAssignment.title}</h3>
                         <p className="text-slate-600 dark:text-slate-400 mb-4 whitespace-pre-wrap">{selectedAssignment.prompt}</p>
                         <form onSubmit={handleSubmit}>
                             <textarea value={submissionContent} onChange={(e) => setSubmissionContent(e.target.value)}
                                 className="w-full h-48 p-3 border rounded-md bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                 placeholder="Type your submission here..."/>
                             {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                             <div className="flex justify-end space-x-4 mt-6">
                                 <button type="button" onClick={() => setSelectedAssignment(null)} className="py-2 px-5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold">
                                     Cancel
                                 </button>
                                 <button type="submit" disabled={isSubmitting || !submissionContent} className="py-2 px-5 rounded-lg bg-primary-600 text-white flex items-center space-x-2 disabled:bg-opacity-50 font-semibold">
                                     {isSubmitting && <Spinner />}
                                     <span>Submit Assignment</span>
                                 </button>
                             </div>
                         </form>
                     </Card>
                 </div>
            )}
        </div>
    );
};

const CourseCreation = ({ setView, onCourseCreate }: { setView: (view: string) => void; onCourseCreate: (topic: string) => Promise<void>;}) => {
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic) return;
        setIsLoading(true); setError('');
        try {
            await onCourseCreate(topic);
            setView('courses');
        } catch (err: any) { setError(err.message || 'An unknown error occurred.');
        } finally { setIsLoading(false); }
    };

    return (
        <div className="p-4 md:p-8">
            <button onClick={() => setView('courses')} className="flex items-center space-x-2 text-primary-600 font-semibold mb-6 hover:underline">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Back to Courses</span>
            </button>
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800/50 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto bg-accent-100 dark:bg-accent-900/50 rounded-full flex items-center justify-center">
                      <SparklesIcon className="h-10 w-10 text-accent-500" />
                    </div>
                    <h2 className="text-3xl font-extrabold mt-4">Create a Course with AI</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Just provide a topic, and our AI curriculum designer will do the rest.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="topic" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Course Topic</label>
                        <input id="topic" type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Introduction to Quantum Physics"
                            className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" disabled={isLoading || !topic} className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50">
                        {isLoading ? <Spinner /> : <SparklesIcon className="h-5 w-5" />}
                        <span>{isLoading ? 'Generating...' : 'Generate Course'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

type ManualCourseCreationData = Omit<Course, 'id' | 'enrolledStudentIds' | 'modules' | 'teacherId'> & {
    modules: (Omit<Module, 'id' | 'assignments'> & {
        assignments: Omit<Assignment, 'id'>[]
    })[]
};

const ManualCourseCreation = ({ setView, onCourseCreate }: { setView: (view: string) => void; onCourseCreate: (course: ManualCourseCreationData) => void; }) => {
    const [courseData, setCourseData] = useState<ManualCourseCreationData>({
        title: '',
        description: '',
        modules: [{ title: '', description: '', content: '', assignments: [{ title: '', prompt: '' }] }]
    });

    const handleCourseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCourseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleModuleChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newModules = courseData.modules.map((mod, i) => i === index ? { ...mod, [name]: value } : mod);
        setCourseData(prev => ({ ...prev, modules: newModules }));
    };

    const handleAssignmentChange = (modIndex: number, assIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newModules = courseData.modules.map((mod, i) => {
            if (i !== modIndex) return mod;
            const newAssignments = mod.assignments.map((ass, j) => j === assIndex ? { ...ass, [name]: value } : ass);
            return { ...mod, assignments: newAssignments };
        });
        setCourseData(prev => ({ ...prev, modules: newModules }));
    };

    const addModule = () => {
        setCourseData(prev => ({
            ...prev,
            modules: [...prev.modules, { title: '', description: '', content: '', assignments: [] }]
        }));
    };

    const removeModule = (index: number) => {
        setCourseData(prev => ({ ...prev, modules: prev.modules.filter((_, i) => i !== index) }));
    };

    const addAssignment = (modIndex: number) => {
        const newModules = courseData.modules.map((mod, i) => {
            if (i === modIndex) {
                return { ...mod, assignments: [...mod.assignments, { title: '', prompt: '' }] };
            }
            return mod;
        });
        setCourseData(prev => ({ ...prev, modules: newModules }));
    };

    const removeAssignment = (modIndex: number, assIndex: number) => {
        const newModules = courseData.modules.map((mod, i) => {
            if (i === modIndex) {
                return { ...mod, assignments: mod.assignments.filter((_, j) => j !== assIndex) };
            }
            return mod;
        });
        setCourseData(prev => ({ ...prev, modules: newModules }));
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCourseCreate(courseData);
    };

    return (
        <div className="p-4 md:p-8">
            <button onClick={() => setView('courses')} className="flex items-center space-x-2 text-primary-600 font-semibold mb-6 hover:underline">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Back to Courses</span>
            </button>
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
                <Card className="p-8">
                    <h2 className="text-3xl font-extrabold mb-6">Create a New Course Manually</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium">Course Title</label>
                            <input type="text" name="title" id="title" value={courseData.title} onChange={handleCourseChange} required className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium">Course Description</label>
                            <textarea name="description" id="description" value={courseData.description} onChange={handleCourseChange} required rows={3} className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                    </div>
                </Card>

                {courseData.modules.map((module, modIndex) => (
                    <Card key={modIndex} className="p-8 relative">
                        <h3 className="text-xl font-bold mb-4">Module {modIndex + 1}</h3>
                        {courseData.modules.length > 1 && (
                            <button type="button" onClick={() => removeModule(modIndex)} className="absolute top-4 right-4 text-red-500 hover:text-red-700">
                                <TrashIcon className="h-6 w-6" />
                            </button>
                        )}
                        <div className="space-y-4">
                            <input type="text" name="title" placeholder="Module Title" value={module.title} onChange={(e) => handleModuleChange(modIndex, e)} required className="block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                            <textarea name="description" placeholder="Module Description" value={module.description} onChange={(e) => handleModuleChange(modIndex, e)} required rows={2} className="block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                            <textarea name="content" placeholder="Module Learning Content" value={module.content} onChange={(e) => handleModuleChange(modIndex, e)} required rows={5} className="block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                        </div>

                        <div className="mt-6">
                            <h4 className="font-semibold mb-2">Assignments</h4>
                            {module.assignments.map((assignment, assIndex) => (
                                <div key={assIndex} className="flex items-start space-x-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg mb-2">
                                    <div className="flex-grow space-y-2">
                                        <input type="text" name="title" placeholder="Assignment Title" value={assignment.title} onChange={(e) => handleAssignmentChange(modIndex, assIndex, e)} required className="block w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md" />
                                        <textarea name="prompt" placeholder="Assignment Prompt" value={assignment.prompt} onChange={(e) => handleAssignmentChange(modIndex, assIndex, e)} required rows={3} className="block w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md" />
                                    </div>
                                    <button type="button" onClick={() => removeAssignment(modIndex, assIndex)} className="text-red-500 hover:text-red-700 p-2">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => addAssignment(modIndex)} className="text-sm font-semibold text-primary-600 hover:underline mt-2">
                                + Add Assignment
                            </button>
                        </div>
                    </Card>
                ))}

                <button type="button" onClick={addModule} className="w-full py-3 border-2 border-dashed border-slate-400 rounded-lg text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
                    + Add Module
                </button>

                <button type="submit" className="w-full py-3 text-white bg-primary-600 rounded-lg font-semibold hover:bg-primary-700">
                    Save Course
                </button>
            </form>
        </div>
    );
};

const GradesView = ({ courses, submissions, loggedInUser, onEvaluate, onGenerateReport, users }: {
    courses: Course[]; submissions: Submission[]; loggedInUser: User; onEvaluate: (submissionId: string) => Promise<void>; onGenerateReport: () => Promise<string>; users: User[];
}) => {
    const [report, setReport] = useState('');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        const generatedReport = await onGenerateReport();
        setReport(generatedReport);
        setIsGeneratingReport(false);
    };

    const handleEvaluate = async (submissionId: string) => {
        setEvaluatingId(submissionId);
        await onEvaluate(submissionId);
        setEvaluatingId(null);
    }
    
    const submissionsToDisplay = useMemo(() => {
        switch (loggedInUser.role) {
            case UserRole.Student:
                return submissions.filter(s => s.studentId === loggedInUser.id);
            case UserRole.Teacher:
                return submissions.filter(s => s.teacherId === loggedInUser.id);
            // Admin role is handled by StudentPerformanceView now
            default:
                return [];
        }
    }, [submissions, loggedInUser]);

    return (
        <div className="p-4 md:p-8 space-y-8">
             <h2 className="text-3xl font-extrabold tracking-tight">
                {loggedInUser.role === UserRole.Student ? "Progress & Grades" : "Submissions"}
            </h2>
            
            {loggedInUser.role === UserRole.Student && (
                 <Card className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold">Your AI Progress Report</h3>
                            <p className="text-slate-500 text-sm mt-1">Get an AI-generated summary of your performance.</p>
                        </div>
                        <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="flex-shrink-0 flex items-center space-x-2 bg-secondary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-secondary-700 transition-colors disabled:opacity-50">
                             {isGeneratingReport ? <Spinner /> : <SparklesIcon className="h-5 w-5"/>}
                             <span>Generate Report</span>
                        </button>
                    </div>
                    {report && <p className="text-slate-600 dark:text-slate-300 mt-4 whitespace-pre-wrap text-sm p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">{report}</p>}
                 </Card>
            )}

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Course</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Assignment</th>
                                {loggedInUser.role !== UserRole.Student && <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Student</th>}
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Grade</th>
                                {loggedInUser.role !== UserRole.Student && <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {submissionsToDisplay.map(sub => {
                                const course = courses.find(c => c.id === sub.courseId);
                                const assignment = course?.modules.flatMap(m => m.assignments).find(a => a.id === sub.assignmentId);
                                const student = users.find(u => u.id === sub.studentId);
                                return (
                                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">{course?.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{assignment?.title}</td>
                                        {loggedInUser.role !== UserRole.Student && <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{student?.username || 'Unknown'}</td>}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${sub.grade !== null ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                                                {sub.grade !== null ? 'Graded' : 'Submitted'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{sub.grade !== null ? `${sub.grade} / 100` : 'N/A'}</td>
                                        {loggedInUser.role !== UserRole.Student && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {sub.grade === null && (
                                                    <button onClick={() => handleEvaluate(sub.id)} disabled={evaluatingId === sub.id} className="flex items-center space-x-2 bg-primary-600 text-white font-bold py-1.5 px-3 rounded-md hover:bg-primary-700 disabled:opacity-50 text-xs">
                                                        {evaluatingId === sub.id ? <Spinner /> : null}
                                                        <span>Evaluate</span>
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                 {submissionsToDisplay.length === 0 && <p className="text-center py-12 text-slate-500">No submissions to display.</p>}
            </Card>
        </div>
    );
};

const StudentPerformanceView: FC<{
    students: User[];
    courses: Course[];
    submissions: Submission[];
    onGenerateReport: (student: User) => Promise<string>;
}> = ({ students, courses, submissions, onGenerateReport }) => {
    const [reports, setReports] = useState<Record<string, string>>({});
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    const handleGenerateReport = async (student: User) => {
        setGeneratingId(student.id);
        const report = await onGenerateReport(student);
        setReports(prev => ({ ...prev, [student.id]: report }));
        setGeneratingId(null);
    };

    const calculateStudentStats = useCallback((studentId: string) => {
        const enrolledCourses = courses.filter(c => c.enrolledStudentIds.includes(studentId));
        const studentSubmissions = submissions.filter(s => s.studentId === studentId && s.grade !== null);
        
        let averageGrade: number | null = null;
        if (studentSubmissions.length > 0) {
            const totalScore = studentSubmissions.reduce((acc, sub) => acc + (sub.grade || 0), 0);
            averageGrade = Math.round(totalScore / studentSubmissions.length);
        }
        
        return {
            enrolledCount: enrolledCourses.length,
            averageGrade: averageGrade,
        };
    }, [courses, submissions]);

    return (
        <div className="p-4 md:p-8 space-y-8">
            <h2 className="text-3xl font-extrabold tracking-tight">Student Performance Overview</h2>
            <div className="space-y-6">
                {students.map(student => {
                    const stats = calculateStudentStats(student.id);
                    return (
                        <Card key={student.id} className="p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-bold capitalize">{student.username}</h3>
                                    <div className="flex items-center space-x-6 mt-2 text-sm text-slate-600 dark:text-slate-400">
                                        <span><span className="font-semibold text-slate-800 dark:text-slate-200">{stats.enrolledCount}</span> Courses Enrolled</span>
                                        <span><span className="font-semibold text-slate-800 dark:text-slate-200">{stats.averageGrade !== null ? `${stats.averageGrade}%` : 'N/A'}</span> Average Grade</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleGenerateReport(student)}
                                    disabled={generatingId === student.id}
                                    className="flex-shrink-0 flex items-center space-x-2 bg-secondary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-secondary-700 transition-colors disabled:opacity-50"
                                >
                                    {generatingId === student.id ? <Spinner /> : <SparklesIcon className="h-5 w-5" />}
                                    <span>Generate AI Summary</span>
                                </button>
                            </div>
                            {reports[student.id] && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                        {reports[student.id]}
                                    </p>
                                </div>
                            )}
                        </Card>
                    );
                })}
                 {students.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                        <UsersIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">No students have been added to the system yet.</h3>
                    </div>
                )}
            </div>
        </div>
    );
};


const EditUserModal: FC<{ user: User, onUpdate: (userId: string, details: Partial<Omit<User, 'id'>>) => void, onClose: () => void }> = ({ user, onUpdate, onClose }) => {
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState('');
    const [role, setRole] = useState(user.role);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedDetails: Partial<Omit<User, 'id'>> = {};
        if (username !== user.username) updatedDetails.username = username;
        if (password) updatedDetails.password = password;
        if (role !== user.role) updatedDetails.role = role;
        
        onUpdate(user.id, updatedDetails);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <Card className="p-8 w-full max-w-md" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-6">Edit User: <span className="capitalize text-primary-600">{user.username}</span></h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="edit-username" className="block text-sm font-medium">Username</label>
                        <input type="text" id="edit-username" value={username} onChange={e => setUsername(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" required />
                    </div>
                     <div>
                        <label htmlFor="edit-password" className="block text-sm font-medium">New Password</label>
                        <input type="password" id="edit-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current"
                            className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="edit-role" className="block text-sm font-medium">Role</label>
                        <select id="edit-role" value={role} onChange={e => setRole(e.target.value as UserRole)}
                            className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg">
                            <option value={UserRole.Student}>Student</option>
                            <option value={UserRole.Teacher}>Teacher</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold">
                            Cancel
                        </button>
                        <button type="submit" className="py-2 px-5 rounded-lg bg-primary-600 text-white font-semibold">
                            Save Changes
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};


const UserManagementView = ({ users, onAddUser, onRemoveUser, onUpdateUser }: { users: User[], onAddUser: (username: string, role: UserRole, password: string) => void, onRemoveUser: (userId: string) => void, onUpdateUser: (userId: string, details: Partial<Omit<User, 'id'>>) => void }) => {
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.Student);
    const [editingUser, setEditingUser] = useState<User | null>(null);


    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (newUsername.trim() && newPassword.trim()) {
            onAddUser(newUsername.trim(), selectedRole, newPassword.trim());
            setNewUsername('');
            setNewPassword('');
        }
    };

    const UserList: FC<{ role: UserRole }> = ({ role }) => {
        const filteredUsers = users.filter(u => u.role === role);
        return (
            <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">{role}s</h3>
                <ul className="space-y-3">
                    {filteredUsers.map(user => (
                        <li key={user.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg">
                            <span className="font-medium capitalize">{user.username}</span>
                            {user.role !== UserRole.Administrator && // Can't edit or delete the admin
                                <div className="flex items-center space-x-3">
                                    <button onClick={() => setEditingUser(user)} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => onRemoveUser(user.id)} className="text-red-500 hover:text-red-700">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            }
                        </li>
                    ))}
                    {filteredUsers.length === 0 && <p className="text-slate-500">No {role.toLowerCase()}s found.</p>}
                </ul>
            </Card>
        );
    };

    return (
        <div className="p-4 md:p-8 space-y-8">
            <h2 className="text-3xl font-extrabold tracking-tight">User Management</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div>
                    <Card className="p-6 mb-8">
                        <h3 className="text-xl font-bold mb-4">Add New User</h3>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium">Username</label>
                                <input type="text" id="username" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                                    className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" required />
                            </div>
                             <div>
                                <label htmlFor="password" className="block text-sm font-medium">Password</label>
                                <input type="password" id="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                    className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" required />
                            </div>
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium">Role</label>
                                <select id="role" value={selectedRole} onChange={e => setSelectedRole(e.target.value as UserRole)}
                                    className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg">
                                    <option value={UserRole.Student}>Student</option>
                                    <option value={UserRole.Teacher}>Teacher</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full py-2 px-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700">
                                Add User
                            </button>
                        </form>
                    </Card>
                </div>
                <div className="space-y-8">
                    <UserList role={UserRole.Administrator} />
                    <UserList role={UserRole.Student} />
                    <UserList role={UserRole.Teacher} />
                </div>
            </div>
            {editingUser && <EditUserModal user={editingUser} onUpdate={onUpdateUser} onClose={() => setEditingUser(null)} />}
        </div>
    );
};


const StudyHelperModal = ({ course, onClose, onAskAI }: { course: Course, onClose: () => void, onAskAI: (course: Course, question: string) => Promise<string> }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question) return;
        setIsLoading(true);
        setError('');
        setAnswer('');
        try {
            const response = await onAskAI(course, question);
            setAnswer(response);
        } catch (err: any) {
            setError(err.message || 'Failed to get an answer.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50" onClick={onClose}>
            <Card className="p-8 w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-2xl font-bold">AI Study Assistant</h3>
                        <p className="text-sm text-slate-500">Ask about "{course.title}"</p>
                    </div>
                     <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">&times;</button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4">
                    {answer && (
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg whitespace-pre-wrap">{answer}</div>
                    )}
                     {isLoading && (
                        <div className="p-4 flex items-center space-x-2 text-slate-500">
                           <Spinner /><span>Thinking...</span>
                        </div>
                    )}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>

                <form onSubmit={handleSubmit} className="flex-shrink-0">
                    <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
                        className="w-full h-24 p-3 border rounded-md bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        placeholder="e.g., Can you summarize the first module?" />
                    <div className="flex justify-end mt-4">
                        <button type="submit" disabled={isLoading || !question} className="py-2 px-5 rounded-lg bg-secondary-600 text-white flex items-center space-x-2 disabled:bg-opacity-50 font-semibold">
                            {isLoading ? <Spinner /> : <SparklesIcon className="h-5 w-5"/>}
                            <span>Ask AI</span>
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

const EditProfileModal: FC<{ user: User, onUpdate: (details: Partial<Omit<User, 'id'>>) => void, onClose: () => void }> = ({ user, onUpdate, onClose }) => {
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        const updatedDetails: Partial<Omit<User, 'id'>> = {};
        if (username !== user.username) updatedDetails.username = username;
        if (password) updatedDetails.password = password;

        if (Object.keys(updatedDetails).length > 0) {
            onUpdate(updatedDetails);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <Card className="p-8 w-full max-w-md" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-6">Edit Your Profile</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="profile-username" className="block text-sm font-medium">Username</label>
                        <input type="text" id="profile-username" value={username} onChange={e => setUsername(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" required />
                    </div>
                     <div>
                        <label htmlFor="profile-password" className="block text-sm font-medium">New Password</label>
                        <input type="password" id="profile-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current"
                            className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                    </div>
                     <div>
                        <label htmlFor="profile-confirm-password" className="block text-sm font-medium">Confirm New Password</label>
                        <input type="password" id="profile-confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm your new password"
                            className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold">
                            Cancel
                        </button>
                        <button type="submit" className="py-2 px-5 rounded-lg bg-primary-600 text-white font-semibold">
                            Save Changes
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

// --- Main App Component (after login) ---

const LmsApp: FC<{ 
    loggedInUser: User;
    users: User[];
    courses: Course[]; 
    submissions: Submission[];
    notifications: AppNotification[];
    onLogout: () => void;
    onAddUser: (username: string, role: UserRole, password: string) => void;
    onRemoveUser: (userId: string) => void;
    onUpdateUser: (userId: string, details: Partial<Omit<User, 'id'>>) => void;
    onSetCourses: (courses: Course[]) => void;
    onSetSubmissions: (submissions: Submission[]) => void;
    onDismissNotification: (id: number) => void;
}> = ({ loggedInUser, users, courses, submissions, notifications, onLogout, onAddUser, onRemoveUser, onUpdateUser, onSetCourses, onSetSubmissions, onDismissNotification }) => {
    const [view, setView] = useState('dashboard');
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [studyHelperCourse, setStudyHelperCourse] = useState<Course | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const handleAICourseCreate = useCallback(async (topic: string) => {
        const newCourseData = await generateCourse(topic);
        const newCourse: Course = { 
            ...newCourseData, 
            id: `course-${Date.now()}`, 
            enrolledStudentIds: [],
            teacherId: loggedInUser.id,
        };
        onSetCourses([...courses, newCourse]);
    }, [courses, onSetCourses, loggedInUser.id]);

    const handleManualCourseCreate = useCallback((courseData: ManualCourseCreationData) => {
        const newCourse: Course = {
            ...courseData,
            id: `course-${Date.now()}`,
            enrolledStudentIds: [],
            teacherId: loggedInUser.id,
            modules: courseData.modules.map(mod => ({
                ...mod,
                id: `mod-${Date.now()}-${Math.random()}`,
                assignments: mod.assignments.map(ass => ({
                    ...ass,
                    id: `ass-${Date.now()}-${Math.random()}`
                }))
            }))
        };
        onSetCourses([...courses, newCourse]);
        setView('courses');
    }, [courses, onSetCourses, loggedInUser.id]);
    
    const handleEnroll = useCallback((courseId: string) => {
        const newCourses = courses.map(c => c.id === courseId ? {...c, enrolledStudentIds: [...c.enrolledStudentIds, loggedInUser.id] } : c);
        onSetCourses(newCourses);
    }, [courses, loggedInUser.id, onSetCourses]);

    const handleUnenroll = useCallback((courseId: string) => {
        const newCourses = courses.map(c => c.id === courseId ? {...c, enrolledStudentIds: c.enrolledStudentIds.filter(id => id !== loggedInUser.id) } : c);
        onSetCourses(newCourses);
    }, [courses, loggedInUser.id, onSetCourses]);

    const handleAssignmentSubmit = useCallback(async (submissionData: Omit<Submission, 'id' | 'submittedAt' | 'grade' | 'feedback' | 'teacherId'>) => {
        const course = courses.find(c => c.id === submissionData.courseId);
        if (!course) throw new Error("Course not found for this submission");
        
        const newSubmission: Submission = { 
            ...submissionData, 
            id: `sub-${Date.now()}`, 
            submittedAt: new Date(), 
            grade: null, 
            feedback: null,
            teacherId: course.teacherId, // Assign the teacherId from the course
        };
        onSetSubmissions([...submissions, newSubmission]);
    }, [submissions, onSetSubmissions, courses]);
    
    const handleEvaluate = useCallback(async (submissionId: string) => {
        const submission = submissions.find(s => s.id === submissionId);
        if (!submission) return;
        const course = courses.find(c => c.id === submission.courseId);
        const assignment = course?.modules.flatMap(m => m.assignments).find(a => a.id === submission.assignmentId);
        if (!assignment) return;
        
        const { grade, feedback } = await evaluateSubmission(assignment, submission);
        onSetSubmissions(submissions.map(s => s.id === submissionId ? { ...s, grade, feedback } : s));
    }, [submissions, courses, onSetSubmissions]);

    const handleGenerateStudentReport = useCallback(async () => {
        return await generateProgressReport(loggedInUser.username, courses, submissions.filter(s => s.studentId === loggedInUser.id));
    }, [courses, submissions, loggedInUser]);
    
    const handleGenerateAdminReportForStudent = useCallback(async (student: User) => {
        const studentSubmissions = submissions.filter(s => s.studentId === student.id && s.grade !== null);
        const enrolledCourses = courses.filter(c => c.enrolledStudentIds.includes(student.id));
        const enrolledCount = enrolledCourses.length;

        let averageGrade: number | null = null;
        if (studentSubmissions.length > 0) {
            const totalScore = studentSubmissions.reduce((acc, sub) => acc + (sub.grade || 0), 0);
            averageGrade = Math.round(totalScore / studentSubmissions.length);
        }
        
        const summaryData = await generateAdminPerformanceSummary(
            student.username,
            enrolledCount,
            averageGrade
        );
        
        if (summaryData.performance === 'N/A') {
            return summaryData.summary;
        }
        
        return `${summaryData.summary} Overall Performance: ${summaryData.performance}.`;
    }, [courses, submissions]);

    const handleGetStudyHelp = useCallback(async (course: Course, question: string): Promise<string> => {
        return await getAiStudyHelp(course, question);
    }, []);

    const handleDeleteCourse = useCallback((courseId: string) => {
        onSetCourses(courses.filter(c => c.id !== courseId));
        onSetSubmissions(submissions.filter(s => s.courseId !== courseId));
        setView('courses');
    }, [courses, submissions, onSetCourses, onSetSubmissions]);

    const handleSelfUpdate = useCallback((details: Partial<Omit<User, 'id'>>) => {
        onUpdateUser(loggedInUser.id, details);
        setIsEditingProfile(false);
    }, [loggedInUser, onUpdateUser]);

    const renderView = () => {
        const selectedCourse = courses.find(c => c.id === selectedCourseId);

        switch (view) {
            case 'dashboard': return <Dashboard loggedInUser={loggedInUser} users={users} courses={courses} submissions={submissions} setView={setView} setSelectedCourseId={setSelectedCourseId}/>;
            case 'courses': return <CourseList courses={courses} loggedInUser={loggedInUser} setView={setView} setSelectedCourseId={setSelectedCourseId} onEnroll={handleEnroll} onUnenroll={handleUnenroll} />;
            case 'course-detail': return <CourseDetail course={selectedCourse} submissions={submissions} loggedInUser={loggedInUser} setView={setView} onAssignmentSubmit={handleAssignmentSubmit} onShowStudyHelper={setStudyHelperCourse} onEnroll={handleEnroll} onDeleteCourse={handleDeleteCourse} users={users}/>;
            case 'create-course': return <CourseCreation setView={setView} onCourseCreate={handleAICourseCreate} />;
            case 'manual-create-course': return <ManualCourseCreation setView={setView} onCourseCreate={handleManualCourseCreate} />;
            case 'grades': return <GradesView courses={courses} submissions={submissions} loggedInUser={loggedInUser} onEvaluate={handleEvaluate} onGenerateReport={handleGenerateStudentReport} users={users}/>;
            case 'performance': return <StudentPerformanceView students={users.filter(u => u.role === UserRole.Student)} courses={courses} submissions={submissions} onGenerateReport={handleGenerateAdminReportForStudent} />;
            case 'user-management': return <UserManagementView users={users} onAddUser={onAddUser} onRemoveUser={onRemoveUser} onUpdateUser={onUpdateUser} />;
            default: return <Dashboard loggedInUser={loggedInUser} users={users} courses={courses} submissions={submissions} setView={setView} setSelectedCourseId={setSelectedCourseId}/>;
        }
    };
    
    return (
        <div className="min-h-screen flex flex-col bg-light dark:bg-dark text-slate-800 dark:text-slate-200">
            <NotificationContainer notifications={notifications} onDismiss={onDismissNotification} />
            <LmsHeader user={loggedInUser} onLogout={onLogout} onEditProfile={() => setIsEditingProfile(true)} />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar view={view} setView={setView} userRole={loggedInUser.role} />
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                    <div className="max-w-7xl mx-auto">
                        {renderView()}
                    </div>
                </main>
            </div>
            {studyHelperCourse && (
                <StudyHelperModal
                    course={studyHelperCourse}
                    onClose={() => setStudyHelperCourse(null)}
                    onAskAI={handleGetStudyHelp}
                />
            )}
            {isEditingProfile && (
                <EditProfileModal
                    user={loggedInUser}
                    onClose={() => setIsEditingProfile(false)}
                    onUpdate={handleSelfUpdate}
                />
            )}
        </div>
    );
};

// --- Custom Hook for localStorage ---

function useLocalStorage<T>(key: string, initialValue: T, expiresInMs?: number): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const itemStr = window.localStorage.getItem(key);
            if (!itemStr) {
                return initialValue;
            }

            const item = JSON.parse(itemStr, (k, v) => {
                if (k === 'submittedAt' && typeof v === 'string') return new Date(v);
                return v;
            });

            if (expiresInMs) {
                // Expects { value: T, expiry: number }
                if (item && typeof item === 'object' && item !== null && 'expiry' in item && 'value' in item) {
                    const isExpired = new Date().getTime() > item.expiry;
                    if (isExpired) {
                        window.localStorage.removeItem(key);
                        return initialValue;
                    }
                    return item.value;
                } else {
                    // Legacy value or malformed. Clear it.
                    window.localStorage.removeItem(key);
                    return initialValue;
                }
            }
            return item;
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);

            if (expiresInMs) {
                const item = {
                    value: valueToStore,
                    expiry: new Date().getTime() + expiresInMs,
                };
                window.localStorage.setItem(key, JSON.stringify(item));
            } else {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    };
    return [storedValue, setValue];
}

const DEFAULT_USERS: User[] = [
    { id: 'admin-01', username: 'admin', role: UserRole.Administrator, password: 'password' },
    { id: 'teacher-01', username: 'teacher', role: UserRole.Teacher, password: 'password' },
    { id: 'student-01', username: 'student', role: UserRole.Student, password: 'password' },
];

// --- App Entry Point with Authentication ---

export default function App() {
    const TWO_DAYS_IN_MS = 2 * 24 * 60 * 60 * 1000;
    const [loggedInUser, setLoggedInUser] = useLocalStorage<User | null>('lms_loggedInUser', null, TWO_DAYS_IN_MS);
    const [users, setUsers] = useLocalStorage<User[]>('lms_users', DEFAULT_USERS);
    const [courses, setCourses] = useLocalStorage<Course[]>('lms_courses', []);
    const [submissions, setSubmissions] = useLocalStorage<Submission[]>('lms_submissions', []);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const addNotification = useCallback((message: string, type: 'success' = 'success') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            removeNotification(id);
        }, 5000);
    }, [removeNotification]);


    const handleLogin = (user: User) => {
        setLoggedInUser(user);
    };

    const handleLogout = () => {
        setLoggedInUser(null);
    };

    const handleAddUser = (username: string, role: UserRole, password: string) => {
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            alert("Username already exists.");
            return;
        }
        const newUser: User = { id: `user-${Date.now()}`, username, role, password };
        setUsers([...users, newUser]);
        if (loggedInUser?.role === UserRole.Administrator) {
            addNotification(`User "${username}" created successfully.`);
        }
    };

    const handleRemoveUser = (userId: string) => {
        if (window.confirm("Are you sure you want to remove this user?")) {
            setUsers(users.filter(u => u.id !== userId));
        }
    };

    const handleUpdateUser = (userId: string, updatedDetails: Partial<Omit<User, 'id'>>) => {
        const user = users.find(u => u.id === userId);
        setUsers(users.map(u => (u.id === userId ? { ...u, ...updatedDetails } : u)));
        
        // If the updated user is the one currently logged in, update their session state too.
        if (loggedInUser && loggedInUser.id === userId) {
            setLoggedInUser(prev => prev ? { ...prev, ...updatedDetails } : null);
        }

        // Determine which notification to show
        if (loggedInUser?.role === UserRole.Administrator && loggedInUser.id !== userId && user) {
            const updatedUsername = updatedDetails.username || user.username;
            addNotification(`User "${updatedUsername}" updated successfully.`);
        } else if (loggedInUser?.id === userId) {
            addNotification('Your profile has been updated successfully.');
        }
    };

    if (!loggedInUser) {
        return <Login onLogin={handleLogin} users={users} />;
    }

    return <LmsApp 
        loggedInUser={loggedInUser} 
        onLogout={handleLogout}
        users={users}
        courses={courses}
        submissions={submissions}
        notifications={notifications}
        onAddUser={handleAddUser}
        onRemoveUser={handleRemoveUser}
        onUpdateUser={handleUpdateUser}
        onSetCourses={setCourses}
        onSetSubmissions={setSubmissions}
        onDismissNotification={removeNotification}
    />;
}
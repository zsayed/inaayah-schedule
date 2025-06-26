import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Global variables provided by the Canvas environment, accessed explicitly via window to avoid 'no-undef' errors
// These variables are specific to the Canvas environment.
// When deploying to GitHub Pages, you need to provide your actual Firebase config here.
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

// IMPORTANT: Replace the empty object `{}` below with your actual Firebase project configuration.
// You can find this in your Firebase project settings (Project settings -> General -> Your apps -> Firebase SDK snippet -> Config).
const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : {
    apiKey: "AIzaSyCyOZCt42iPPX7-karLoFiLlB_JMmVIPtA",
    authDomain: "inaayah-schedule.firebaseapp.com",
    projectId: "inaayah-schedule",
    storageBucket: "inaayah-schedule.firebasestorage.app",
    messagingSenderId: "833061472939",
    appId: "1:833061472939:web:7f33039a18ee1924cbc5ee",
    measurementId: "G-73LW0QNY5X"
};

const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;


// Helper to get today's date in IHDA-MM-DD format (local time)
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Initial schedule data (this will be the template for a new day if no data is in Firestore)
const initialSchedule = [
    { id: 'morning-wakeup-fajr', time: '5:30 AM', description: 'Wakeup, Brush & Fajr Namaz', icon: '⏰🦷🕌', completed: false, section: 'morning' },
    { id: 'morning-bath', time: '06:00 - 06:30 AM', description: 'Bath Time', icon: '🛀', completed: false, section: 'morning' },
    { id: 'morning-books-reading', time: '6:30 - 07:00 AM', description: 'Books Reading', icon: '📚', completed: false, section: 'morning' },
    { id: 'morning-writing', time: '07:00 - 07:30 AM', description: 'Writing Practice', icon: '✍️', completed: false, section: 'morning' },
    { id: 'morning-breakfast-homework', time: '07:30 - 08:30 AM', description: 'Breakfast & School Homework', icon: '🍳🏫📝', completed: false, section: 'morning' },
    { id: 'morning-get-ready', time: '08:30 - 09:00 AM', description: 'Get Ready for School', icon: '🎒', completed: false, section: 'morning' },
    { id: 'afternoon-freshen-up', time: '03:00 - 03:30 PM', description: 'Freshen Up After School', icon: '🚿👕', completed: false, section: 'afternoon' },
    { id: 'afternoon-tuitions', time: '03:30 - 04:50 PM', description: 'Tuitions', icon: '🧑‍🏫', completed: false, section: 'afternoon' },
    { id: 'afternoon-islamic-studies', time: '05:00 - 06:00 PM', description: 'Islamic Studies', icon: '📖⭐', completed: false, section: 'afternoon' },
    { id: 'evening-dinner-screentime', time: '06:00 - 07:30 PM', description: 'Dinner & Screen Time', icon: '🍽️📱', completed: false, section: 'evening' },
    { id: 'evening-playtime', time: '07:30 - 08:00 PM', description: 'Play Time Outside', icon: '⚽🌳', completed: false, section: 'evening' },
    { id: 'evening-brush-story', time: '08:00 - 08:30 PM', description: 'Brush & Story Reading', icon: '🦷📖', completed: false, section: 'evening' },
    { id: 'evening-sleep', time: '08:30 PM', description: 'Sweet Dreams! (Sleep)', icon: '😴', completed: false, section: 'evening' },
];

// Custom Confirmation Modal Component
const ConfirmationModal = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                <p className="text-lg font-semibold mb-6">{message}</p>
                <div className="flex justify-around gap-4">
                    <button
                        onClick={onConfirm}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 flex-1"
                    >
                        Yes, Reset
                    </button>
                    <button
                        onClick={onCancel}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 flex-1"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

function App() {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentDate, setCurrentDate] = useState(getTodayDate());
    const [showResetConfirm, setShowResetConfirm] = useState(false); // State to control modal visibility

    // Initialize Firebase and set up authentication listener
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAuthReady(true);
                } else {
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } else {
                            await signInAnonymously(firebaseAuth);
                        }
                    } catch (authError) {
                        console.error("Firebase authentication error:", authError);
                        setError("Failed to authenticate. Please try again.");
                        setIsAuthReady(true);
                    }
                }
            });

            return () => unsubscribe();
        } catch (initError) {
            console.error("Firebase initialization error:", initError);
            setError("Failed to initialize Firebase. Please check console for details.");
            setLoading(false);
        }
    }, []);

    // Fetch or initialize schedule data from Firestore for the current date
    useEffect(() => {
        if (!db || !userId || !isAuthReady) {
            console.log("Waiting for DB, User ID, or Auth Ready:", { db: !!db, userId, isAuthReady });
            return;
        }

        const scheduleDocRef = doc(db, `artifacts/${appId}/users/${userId}/dailySchedules`, currentDate);
        console.log(`Attempting to load schedule for: ${currentDate}`);

        const unsubscribe = onSnapshot(scheduleDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log(`Schedule loaded for ${currentDate}:`, data.activities);
                setSchedule(data.activities || initialSchedule);
            } else {
                console.log(`No schedule found for ${currentDate}, initializing...`);
                const newDaySchedule = initialSchedule.map(item => ({ ...item, completed: false }));
                setDoc(scheduleDocRef, { activities: newDaySchedule })
                    .then(() => {
                        setSchedule(newDaySchedule);
                        console.log(`Initial schedule saved for ${currentDate}.`);
                    })
                    .catch((e) => {
                        console.error("Error setting initial document for new date:", e);
                        setError("Failed to save initial schedule for this day.");
                    });
            }
            setLoading(false);
        }, (err) => {
            console.error("Error listening to schedule changes:", err);
            setError("Failed to load schedule. Please check your connection.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady, currentDate]);

    // Function to handle checkbox change
    const handleCheckboxChange = useCallback(async (activityId) => {
        if (!db || !userId) {
            console.error("Database or User ID not available for checkbox change.");
            setError("Cannot save progress: Not connected to database.");
            return;
        }

        const updatedSchedule = schedule.map(activity =>
            activity.id === activityId ? { ...activity, completed: !activity.completed } : activity
        );
        setSchedule(updatedSchedule);

        const scheduleDocRef = doc(db, `artifacts/${appId}/users/${userId}/dailySchedules`, currentDate);
        try {
            await setDoc(scheduleDocRef, { activities: updatedSchedule });
            console.log("Checkbox state updated in Firestore.");
        } catch (e) {
            console.error("Error updating document on checkbox change:", e);
            setError("Failed to save progress. Please try again.");
            setSchedule(prevSchedule => prevSchedule.map(activity =>
                activity.id === activityId ? { ...activity, completed: !activity.completed } : activity
            ));
        }
    }, [db, userId, schedule, currentDate]);

    // Function to show the custom confirmation modal
    const handleResetClick = useCallback(() => {
        setShowResetConfirm(true);
    }, []);

    // Function to perform the actual reset after confirmation
    const confirmReset = useCallback(async () => {
        console.log("Confirmed reset. Proceeding...");
        setShowResetConfirm(false); // Hide the modal

        if (!db || !userId) {
            console.error("Database or User ID not available for reset. db:", !!db, "userId:", userId);
            setError("Cannot reset schedule: Not connected to database.");
            return;
        }

        console.log("Confirmed reset. Calling setDoc to clear schedule.");
        const clearedSchedule = initialSchedule.map(activity => ({ ...activity, completed: false }));
        setSchedule(clearedSchedule);

        const scheduleDocRef = doc(db, `artifacts/${appId}/users/${userId}/dailySchedules`, currentDate);
        try {
            await setDoc(scheduleDocRef, { activities: clearedSchedule });
            console.log(`Schedule reset for ${currentDate} and saved to Firestore successfully.`);
        } catch (e) {
            console.error("Reset failed with error:", e);
            setError(`Failed to reset schedule: ${e.message || 'Unknown error'}.`);
            setSchedule(initialSchedule);
        }
    }, [db, userId, currentDate]);

    // Function to cancel the reset
    const cancelReset = useCallback(() => {
        console.log("Reset cancelled.");
        setShowResetConfirm(false); // Hide the modal
    }, []);

    // Handle date input change
    const handleDateChange = (event) => {
        setCurrentDate(event.target.value);
        setLoading(true);
    };

    // Go to today's date
    const goToToday = useCallback(() => {
        setCurrentDate(getTodayDate());
        setLoading(true);
    }, []);

    // Group activities by section for rendering
    const groupedScheduleSections = ['morning', 'afternoon', 'evening'];
    const getSectionTitle = (section) => {
        switch (section) {
            case 'morning': return '🌅 Morning';
            case 'afternoon': return '☀️ Afternoon';
            case 'evening': return '🌙 Evening';
            default: return '';
        }
    };
    const getSectionBgColor = (section) => {
        switch (section) {
            case 'morning': return 'bg-[#6a0572]';
            case 'afternoon': return 'bg-[#10b981]';
            case 'evening': return 'bg-[#eab307]';
            default: return 'bg-gray-500';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
                <div className="text-xl font-semibold text-[#6a0572]">Loading Inaayah's Schedule...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-red-100 text-red-700 p-4">
                <div className="text-xl font-semibold">Error: {error}</div>
                <div className="text-sm mt-2">Please refresh the page or try again later.</div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 md:p-12 min-h-screen flex items-center justify-center font-inter bg-[#f0f4f8]">
            <div className="max-w-4xl w-full mx-auto bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl">
                <h1 className="text-center text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#6a0572] mb-8 sm:mb-10 animate-bounce">
                    Inaayah's Daily Fun Schedule!
                </h1>

                {/* Display User ID */}
                <div className="text-center text-gray-500 mb-6 text-sm">
                    User ID: <span className="font-mono bg-gray-100 p-1 rounded break-all">{userId || 'Loading...'}</span>
                </div>

                {/* Date Selector and Reset Button */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
                    <input
                        type="date"
                        value={currentDate}
                        onChange={handleDateChange}
                        className="p-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-[#6a0572] w-full sm:w-auto"
                    />
                    <button
                        onClick={goToToday}
                        className="bg-[#6a0572] hover:bg-purple-800 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 w-full sm:w-auto"
                    >
                        Go to Today
                    </button>
                    <button
                        onClick={handleResetClick}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 w-full sm:w-auto"
                    >
                        Reset This Day
                    </button>
                </div>

                {/* Schedule Sections */}
                {groupedScheduleSections.map(section => (
                    <div key={section} className="mb-8">
                        <h2 className={`${getSectionBgColor(section)} text-white p-3 rounded-xl mb-4 inline-block text-xl sm:text-2xl font-bold shadow-md`}>
                            {getSectionTitle(section)}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {schedule
                                .filter(activity => activity.section === section)
                                .map(activity => (
                                    <div key={activity.id} className="bg-white rounded-xl shadow-md p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out hover:scale-[1.02]">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <span className="text-4xl icon">{activity.icon}</span>
                                            <div>
                                                <div className="text-[#6a0572] font-semibold text-lg">{activity.time}</div>
                                                <div className="text-gray-700 text-base">{activity.description}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-center pt-2 border-t border-gray-100 mt-auto">
                                            <input
                                                type="checkbox"
                                                className="transform scale-150 sm:scale-[1.75] md:scale-200 accent-[#6a0572] cursor-pointer"
                                                checked={activity.completed}
                                                onChange={() => handleCheckboxChange(activity.id)}
                                            />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}

                {/* Custom Confirmation Modal */}
                {showResetConfirm && (
                    <ConfirmationModal
                        message={`Are you sure you want to reset Inaayah's schedule for ${currentDate}?`}
                        onConfirm={confirmReset}
                        onCancel={cancelReset}
                    />
                )}
            </div>
        </div>
    );
}

export default App;

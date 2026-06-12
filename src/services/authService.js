import { auth, db, isFirebaseEnabled } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { mockDb } from '../utils/mockDb';

export const authService = {
  login: async (email, password) => {
    if (isFirebaseEnabled) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        const userDocRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            userId: uid,
            name: data.name,
            email: data.email,
            joinDate: data.joinDate,
            xp: Number(data.xp) || 0,
            level: Number(data.level) || 1,
            streak: Number(data.streak) || 0,
            longestStreak: Number(data.longestStreak) || 0
          };
        } else {
          // If the Auth account exists but profile doc doesn't, create a stub profile
          const joinDate = new Date().toISOString().split('T')[0];
          const newProfile = {
            userId: uid,
            name: email.split('@')[0],
            email: email.toLowerCase(),
            joinDate,
            xp: 0,
            level: 1,
            streak: 0,
            longestStreak: 0
          };
          await setDoc(userDocRef, newProfile);
          return newProfile;
        }
      } catch (err) {
        throw new Error(err.message || 'Login failed');
      }
    } else {
      // Mock db implementation
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const user = mockDb.login(email, password);
            resolve(user);
          } catch (e) {
            reject(e);
          }
        }, 600);
      });
    }
  },

  register: async (name, email, password) => {
    if (isFirebaseEnabled) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const joinDate = new Date().toISOString().split('T')[0];
        
        const newProfile = {
          userId: uid,
          name,
          email: email.toLowerCase(),
          joinDate,
          xp: 0,
          level: 1,
          streak: 0,
          longestStreak: 0
        };
        
        await setDoc(doc(db, 'users', uid), newProfile);
        return newProfile;
      } catch (err) {
        throw new Error(err.message || 'Registration failed');
      }
    } else {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const user = mockDb.register(name, email, password);
            resolve(user);
          } catch (e) {
            reject(e);
          }
        }, 600);
      });
    }
  }
};


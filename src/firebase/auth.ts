
import { auth, database } from "./firebaseConfig";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { ref, get, set, update, remove, onDisconnect } from "firebase/database";

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const globalRef = ref(database, `global/activeBoardId`);
  let boardId: string;

  const snapshot = await get(globalRef);
  if (!snapshot.exists()) {
    boardId = user.uid; // First user creates the board
    await set(globalRef, boardId);
  } else {
    boardId = snapshot.val(); // All others join
  }

  await set(ref(database, `users/${user.uid}`), {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
  });
const userRef = ref(database, `boards/${boardId}/users/${user.uid}`);
  // Add user under the board
  await set(userRef, {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    online: true
  });
onDisconnect(userRef).update({
    online: false,
    lastActive: Date.now()
  });
  return { result, boardId };
};

export const logOut = async (boardId?: string, uid?: string) => {
  if (boardId && uid) {
    const userRef = ref(database, `boards/${boardId}/users/${uid}`);
    await update(userRef, { online: false });
  }
  await signOut(auth);
};

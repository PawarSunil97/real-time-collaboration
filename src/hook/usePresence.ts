
import { useEffect } from "react";
import { ref, onDisconnect, onValue, set, serverTimestamp, update } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

export const usePresence = (boardId: string | null | undefined) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !boardId) return;

    const userRef = ref(database, `boards/${boardId}/users/${user.uid}`);
    const connectedRef = ref(database, ".info/connected");

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        set(userRef, {
          uid: user.uid,
          displayName: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
          online: true,
          lastActive: serverTimestamp(),
        });
        onDisconnect(userRef).update({
          online: false,
          lastActive: serverTimestamp(),
        });
        const interval = setInterval(() => {
        update(userRef, { lastActive: Date.now() });
      }, 15000);

      return () => clearInterval(interval);
      }
    });

    return () => unsubscribe();
  }, [user, boardId]);
};

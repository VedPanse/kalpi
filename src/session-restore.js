// Expiration is a reason to renew, not to erase the creator's saved session.
export async function restoreCreatorSession(auth, hasWorkspace = false) {
 const saved=await auth.getUser();
 if(saved?.id_token && !saved.expired)return saved;
 if(!saved && !hasWorkspace)return null;
 try {
  const renewed=await auth.signinSilent();
  if(renewed?.id_token && !renewed.expired)return renewed;
 } catch {}
 throw Error('Your saved workspace is still here, but your sign-in could not be renewed. Reconnect your sign-in to continue on this page.');
}

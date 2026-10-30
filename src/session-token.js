// The realtime socket can outlive its JWT. HTTP uploads need the current OIDC token.
export async function currentHttpToken({manager,fallback,refresh}) {
 if(!manager)return fallback;
 let user=await manager.getUser();
 if(!user)return fallback;
 if(user.expired || (typeof user.expires_in==='number' && user.expires_in<60)){
  try{user=await refresh();}catch{throw Error('Your sign-in expired. Click Creator sign in, then retry the saved model’s files. Your model is already saved.');}
 }
 if(!user?.id_token||user.expired)throw Error('Your sign-in expired. Sign in again, then retry the saved model’s files.');
 return user.id_token;
}

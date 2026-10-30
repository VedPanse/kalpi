import {restoreCreatorSession} from './session-restore.js';
import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const pendingKey = "kalpi-creator-signin-pending";
let manager,
  signInWindow,
  currentUser = null,
  watched = false;

function authManager(config) {
  if (!config.authClientId)
    throw Error("Creator sign-in is not configured on this deployment.");
  return (manager ||= new UserManager({
    authority: config.authAuthority,
    client_id: config.authClientId,
    redirect_uri: location.origin + "/auth/callback",
    post_logout_redirect_uri: location.origin,
    response_type: "code",
    silentRequestTimeoutInSeconds: 10,
    scope: "openid profile email",
    userStore: new WebStorageStateStore({ store: localStorage }),
    stateStore: new WebStorageStateStore({ store: localStorage }),
  }));
}

export function signInPending() {
  const started = Number(localStorage.getItem(pendingKey));
  return started > 0 && Date.now() - started < 15 * 60 * 1000;
}

// Open synchronously from the click, before any asynchronous work, so browser
// popup blocking does not strand the email flow. The app stays open separately.
export function openCreatorSignIn({ restart = false } = {}) {
  if (!restart && signInWindow && !signInWindow.closed) {
    signInWindow.focus();
    return;
  }
  localStorage.setItem("kalpi-auth-return",location.pathname+location.search);
  const opened = window.open("/auth/start", "_blank");
  if (!opened)
    throw Error(
      "Your browser blocked the sign-in tab. Allow pop-ups for Kalpi, then try again.",
    );
  // Completion uses same-origin storage, so the provider does not need an opener.
  opened.opener = null;
  signInWindow = opened;
  localStorage.setItem(pendingKey, String(Date.now()));
}

export async function redirectCreatorSignIn(config) {
  const auth = authManager(config);
  await auth.clearStaleState();
  await auth.signinRedirect();
}

export async function initializeCreatorAuth(
  config,
  onSessionChanged = () => location.reload(),
) {
  const auth = authManager(config);
  let restoreError;
  if (location.pathname === "/auth/callback" && window.self !== window.top) {
    await auth.signinSilentCallback();
    // The parent consumes this callback. Do not start a second app in its iframe.
    return new Promise(()=>{});
  }
  if (location.pathname === "/auth/callback") {
    try {
      currentUser = await auth.signinRedirectCallback();
      localStorage.removeItem(pendingKey);
      const destination=localStorage.getItem("kalpi-auth-return")||"/";
      const target=destination.startsWith('/')&&!destination.startsWith('//')&&!destination.startsWith('/auth/')?destination:'/';
      history.replaceState({}, "", target);
      location.replace(target);
      return new Promise(()=>{});
    } catch {
      // Do not leave a consumed code in the URL or make Reload loop forever.
      history.replaceState({}, "", "/");
      throw Error(
        "This sign-in could not be completed. Return to Kalpi and start a fresh sign-in. Keep the sign-in tab open while opening the email link in another tab.",
      );
    }
  } else {
    try{currentUser=await restoreCreatorSession(auth,Boolean(localStorage.getItem('kalpi-project')));}
    catch(e){restoreError=e;}
  }
  if (!watched) {
    watched = true;
    const userKey = `oidc.user:${config.authAuthority}:${config.authClientId}`;
    const refresh = async () => {
      const user = await auth.getUser();
      if (
        user?.id_token &&
        !user.expired &&
        user.id_token !== currentUser?.id_token
      ) {
        currentUser = user;
        localStorage.removeItem(pendingKey);
        onSessionChanged(user);
      }
    };
    window.addEventListener("storage", (event) => {
      if (event.key === userKey) void refresh();
    });
    // Also recover when the original tab was suspended during the callback.
    window.addEventListener("focus", () => void refresh());
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void refresh();
    });
  }
  if(restoreError)throw restoreError;
  return currentUser;
}

export async function creatorUser() {
  const user = await manager?.getUser();
  return user && !user.expired && user.id_token ? user : null;
}

let tokenRenewal;
export async function creatorHttpToken(fallback) {
 const {currentHttpToken}=await import('./session-token.js');
 return currentHttpToken({manager,fallback,refresh:()=>{
  if(!tokenRenewal)tokenRenewal=manager.signinSilent().finally(()=>{tokenRenewal=null;});
  return tokenRenewal;
 }});
}

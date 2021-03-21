import { useEffect, useState } from "react";

const Auth = ({ src, onAuth }) => {
  // Store a ref so we can close the popup
  let popup = null;

  // Open popup
  const initAuth = () => {
    popup = window.open(src, "oauth_popup", "width=500,height=500");
  }

  // Parse data sent from popup, close it and return.
  const onMessage = msg => {
    const res = msg.data.match(/access_token=(?<token>[^&]+)&token_type=(?<type>[^&]+)/);
    popup.close();
    onAuth(res.groups);
  }

  // Listen from message from popup
  useEffect(() => {
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    }
  }, []);

  return (
    <div>
      <h1>Auth</h1>
      <button onClick={initAuth}>Auth</button>
    </div>
  )
}

export default Auth;
import App from './App'
import Auth from './Auth'
import { useState } from 'react';

const OAUTH_URL = "https://be.contentful.com/oauth/authorize?response_type=token&client_id=RnZ8iOSuRoaCAz92IH31EOdjFIVdqO3dZQL24xFB4Jw&redirect_uri=https://sebost.se/oauth.html&scope=content_management_manage";

const Root = () => {
  const [ oauthRes, setOauthRes ] = useState(null);

  return (
    <div className="Root">
      { !oauthRes?.token 
        ? <Auth src={OAUTH_URL} onAuth={setOauthRes} /> 
        : <App token={oauthRes.token} />
      }
    </div>
  )
}

export default Root;

let accessToken = null;

export const setAccessToken = (token) => {
    if(token){
 accessToken = token;
    }
    else{
       accessToken =  localStorage.getItem("accessToken");
    }
 
};

export const getAccessToken = () => accessToken;

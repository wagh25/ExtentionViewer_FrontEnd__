
import React from 'react'
import { UserContext } from './userContext'
import { useState } from 'react'

const UserProvider = ({children}) => {
  const [user, setUser] = useState({name:"",email:"",isAuthenticated:false});

  return (
    <div>
      <UserContext.Provider value={{ user, setUser}}>
        {children}
      </UserContext.Provider>
    </div>
  )
}

export default UserProvider


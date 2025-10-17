/* Imports */
import React, { type JSX } from "react";

/* Local Imports */
import { PAGE_ROOT } from "@/routes/paths";
import {
  getAccessToken,
  isValidToken,
  setAccessToken,
  removeAccessToken,
} from "@/utilities/auth";
import { getUserProfileRequest } from "@/services/account/account";

// ----------------------------------------------------------------------

/* Types/Interfaces */
export interface IAccount {
  id: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
}

export interface ISessionState {
  isAuthenticated: boolean;
  authToken: string | null;
  user: any | null;
  isPageLoaded: boolean | null;
  LoginUser: (token: string, rememberMe: boolean) => void;
  LogoutUser: () => void;
}

export interface ISessionProps {
  children: React.ReactNode;
}

// ----------------------------------------------------------------------

const initialState: ISessionState = {
  isAuthenticated: false,
  authToken: null,
  user: null,
  isPageLoaded: true,
  LoginUser: async () => {},
  LogoutUser: () => {},
};

const SessionContext = React.createContext<ISessionState>(initialState);

class Session extends React.Component<ISessionProps, ISessionState> {
  constructor(props: ISessionProps) {
    super(props);

    const accessToken = getAccessToken();
    const user = isValidToken(accessToken as string);

    this.state = {
      isAuthenticated: Boolean(accessToken && user),
      authToken: accessToken!,
      user: null,
      isPageLoaded: true,

      LoginUser: async (token: string, rememberMe: boolean) => {
        setAccessToken(token, rememberMe);

        this.setState((prevState) => ({
          ...prevState,
          isAuthenticated: true,
          authToken: token,
        }));

        await this.getUserProfile();
      },

      LogoutUser: () => {
        removeAccessToken();

        this.setState((prevState) => ({
          ...prevState,
          isAuthenticated: false,
          authToken: null,
          user: null,
        }));
        window.location.href = PAGE_ROOT.login.absolutePath;
      },
    };

    // Bind methods to the class instance
    this.getUserProfile = this.getUserProfile.bind(this);
  }

  componentDidMount(): void {
    if (this.state.authToken) {
      this.getUserProfile();
    } else {
      this.setState((prevState) => ({
        ...prevState,
        isPageLoaded: false,
      }));
    }
  }

  async getUserProfile(): Promise<void> {
    try {
      const response: any = await getUserProfileRequest();
      console.log("getUserProfile response", response);
      if (response?.status.response_code === 200 && response?.data) {
        this.setState((prevState) => ({
          ...prevState,
          user: response.data,
          isPageLoaded: false,
        }));
      }
    } catch (error: any) {
      console.log("getUserProfile error", error);
      this.state.LogoutUser();

      this.setState((prevState) => ({
        ...prevState,
        isPageLoaded: false,
      }));
    }
  }

  render(): JSX.Element {
    return (
      <SessionContext.Provider value={this.state}>
        {!this.state.isPageLoaded && this.props.children}
      </SessionContext.Provider>
    );
  }
}

export default SessionContext;
export const SessionProvider = Session;
export const SessionConsumer = SessionContext.Consumer;

export interface ChatContext {
  username?: string;
  userLevel?: string;
  recentWords?: string[];
  totalAcertos?: number;
  totalErros?: number;
}

export interface ChatServiceResponse {
  success: boolean;
  message: string;
  username: string;
  userLevel?: string;
  timestamp: Date;
  error?: string;
}
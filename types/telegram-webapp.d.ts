export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        openTelegramLink?: (url: string) => void;
        shareMessage?: (
          messageId: string,
          callback?: (isSent: boolean) => void,
        ) => void;
        switchInlineQuery?: (
          query: string,
          chooseChatTypes?: Array<"users" | "bots" | "groups" | "channels">,
        ) => void;
        HapticFeedback?: {
          impactOccurred: (
            style: "light" | "medium" | "heavy" | "rigid" | "soft",
          ) => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

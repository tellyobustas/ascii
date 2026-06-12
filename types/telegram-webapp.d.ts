export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        openTelegramLink?: (url: string) => void;
        switchInlineQuery?: (
          query: string,
          chooseChatTypes?: Array<"users" | "bots" | "groups" | "channels">,
        ) => void;
      };
    };
  }
}

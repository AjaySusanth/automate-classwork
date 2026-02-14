export default class NotificationChannel {
  getName() {
    throw new Error("getName() must be implemented by subclasses");
  } // returns the name of the channel (eg:telegram/whatsapp)

  async sendMessage(user, message) {
    throw new Error("sendMessage() must be implemented by subclasses");
  }
}

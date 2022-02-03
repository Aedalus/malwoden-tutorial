export class GameLog {
  maxHistory: number;
  logs: string[] = [];

  constructor(maxHistory = 10) {
    this.maxHistory = maxHistory;
  }

  addMessage(...msgs: string[]) {
    this.logs.push(...msgs); // Add any new messages
    while (this.logs.length > this.maxHistory) {
      // Trim the history
      this.logs.shift();
    }
  }

  getLastMessages(count: number) {
    // Oldest messages are first in the array, we'll reverse it to get the newest.
    // We have to slice the first time to not mutate the original array
    return this.logs.slice().reverse().slice(0, count);
  }
}

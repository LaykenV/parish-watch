export interface AskChallengeAdapter {
  challengeBeforeRequest(): Promise<{ challengeId: string } | null>
  resolve(challengeId: string): Promise<boolean>
}

export const inactiveAskChallengeAdapter: AskChallengeAdapter = {
  async challengeBeforeRequest() {
    return null
  },
  async resolve(_challengeId: string) {
    return false
  },
}

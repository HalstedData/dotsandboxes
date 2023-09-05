import { UserInfo } from "../../commonts/types";
import { LeaderboardType } from "../../node-ws-server/leaderboard";
import cn from 'classnames';

type LeaderboardProps = {
  leaderboard: LeaderboardType | null;
  userInfo: UserInfo | null;
}

export default function Leaderboard(props: LeaderboardProps) {
  const { leaderboard, userInfo } = props;
  if (!leaderboard) {
    return null;
  }

  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <i>last updated: {(new Date(leaderboard.lastUpdated)).toLocaleString()}</i><br />
      <table>
        <thead>
          <th>userID</th>
          <th>score</th>
        </thead>
        <tbody>
          {
            leaderboard.entries.map(({ userID, score }) => {
              return (
                <tr className={cn({ isYou: userID === userInfo?.userID })}>
                  <td>{userID}</td>
                  <td>{score}</td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
    </div>
  )
}
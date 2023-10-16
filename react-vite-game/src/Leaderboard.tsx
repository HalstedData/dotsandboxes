import { UserInfo } from "../../commonts/types";
import { LeaderboardType } from "../../node-ws-server/leaderboard";
import cn from 'classnames';

type LeaderboardProps = {
  leaderboard: LeaderboardType | null;
  userInfo: UserInfo | null;
}
const positions = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th'
];


export default function Leaderboard(props: LeaderboardProps) {
  const { leaderboard, userInfo } = props;
  if (!leaderboard) {
    return null;
  }

  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <table>
        <thead>
          <th>user</th>
          <th>score</th>
        </thead>
        <tbody>
          {
            leaderboard.entries.map(({ username, score }, index) => {
              return (
                <tr className={cn({ isYou: username === userInfo?.username })}>
                  <td><small>{positions[index]}</small> {username}</td>
                  <td>{score}</td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
      <i>last updated: {(new Date(leaderboard.lastUpdated)).toLocaleString()}</i>
    </div>
  )
}
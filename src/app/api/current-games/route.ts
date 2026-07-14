import { CurrentGamesData } from '@/models/current-games';


export const GET = async () => {
  const data = await CurrentGamesData();
  return Response.json(data, { status: 200 });
};

import { GET as scorePredictionsGET } from "../score-predictions/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return scorePredictionsGET(request);
}

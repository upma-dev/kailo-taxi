import { ApiError } from '../../../../utils/ApiError.js';
import { getMyReferrals, getReferralDetails, listReferrals } from '../../services/referralReportService.js';

export const adminListReferrals = async (req, res) => {
  const data = await listReferrals({
    kind: req.query.kind,
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
  });
  res.json({ success: true, data });
};

export const adminGetReferralDetails = async (req, res) => {
  const data = await getReferralDetails(req.params.kind, req.params.id);
  if (!data) throw new ApiError(404, 'Not found');
  res.json({ success: true, data });
};

// For the user app and the driver app: "My invites".
export const getMyReferralList = (kind) => async (req, res) => {
  const data = await getMyReferrals(kind, req.auth?.sub);
  if (!data) throw new ApiError(404, 'Account not found');
  res.json({ success: true, data });
};

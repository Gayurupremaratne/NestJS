export class GetReportAssetsDto {
  status?: string;
  fileKey?: string;
  _count: AssetReportInterface;
}

export interface AssetReportInterface {
  assetReportUser: number;
}

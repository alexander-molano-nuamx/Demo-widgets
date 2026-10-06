import { LicenseInfo } from "@mui/x-license";

const licenseKey = process.env.NEXT_MUI_LICENSE_KEY;

if (licenseKey) {
  LicenseInfo.setLicenseKey(licenseKey);
}

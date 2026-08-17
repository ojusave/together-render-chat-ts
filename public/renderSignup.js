export function renderSignupUrlWithUtms(
  content = "navbar_button",
) {
  const params = new URLSearchParams({
    utm_source: "github",
    utm_medium: "referral",
    utm_campaign: "ojus_demos",
    utm_content: content,
  });

  return `https://dashboard.render.com/register?${params.toString()}`;
}

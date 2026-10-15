import axios from "axios";

/*
 * Replacement for the deprecated request-promise package.
 * Takes the same request-promise style options the CMC helpers build
 * ({ method, uri, qs, headers, body, json: true }) and returns the parsed
 * JSON response body, like rp(options) did with json: true. A non-2xx status
 * still rejects, so the callers' catch blocks behave as before.
 * Compressed responses are handled by axios automatically (the old gzip option).
 */
export const requestJson = async (options: any): Promise<any> => {
  const response = await axios({
    method: options.method || "GET",
    url: options.uri || options.url,
    params: options.qs,
    headers: options.headers,
    data: options.body,
  });
  return response.data;
};

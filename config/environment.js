'use strict';

module.exports = function(environment/* , appConfig */) {

  if (environment === "test") {
    return {
      APP: {
        parseUrl: "http://localhost:1337",
        parseNamespace: "parse",
        parseEndpoint: "http://localhost:1337/parse/",
        parseFilesEndpoint: "http://localhost:1337/parse/files/",
        applicationId: "appId"
      }
    };
  }

  return { };
};

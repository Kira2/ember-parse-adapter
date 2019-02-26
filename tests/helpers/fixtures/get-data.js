import $ from "jquery";

export default function getData(adapter, className, query) {
  var apiUrl = adapter.get("host") + "/" + adapter.get("namespace");
  var applicationId = adapter.get("applicationId");
  var restApiId = adapter.get("restApiId");

  var url = apiUrl + "/classes/" + className;

  return $.ajax({
    url: url,
    type: "GET",
    data: query,
    beforeSend: function(request) {
      request.setRequestHeader("X-Parse-Application-Id", applicationId);
      request.setRequestHeader("X-Parse-REST-API-Key", restApiId);
      request.setRequestHeader("Content-Type", "application/json");
    }
  });
}

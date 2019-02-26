import $ from "jquery";

export default function deleteData(adapter, className, id) {
  var applicationId = adapter.get("applicationId");
  var restApiId = adapter.get("restApiId");
  var apiUrl = adapter.get("host") + "/" + adapter.get("namespace");

  var url = apiUrl + "/classes/" + className + "/" + id;

  return $.ajax({
    url: url,
    type: "DELETE",
    beforeSend: function(request) {
      request.setRequestHeader("X-Parse-Application-Id", applicationId);
      request.setRequestHeader("X-Parse-REST-API-Key", restApiId);
      request.setRequestHeader("Content-Type", "application/json");
    }
  });
}

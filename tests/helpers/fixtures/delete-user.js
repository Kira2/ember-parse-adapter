import $ from "jquery";

export default function deleteUser(adapter, userId, sessionToken) {
  var apiUrl = adapter.get("host") + "/" + adapter.get("namespace");
  var applicationId = adapter.get("applicationId");
  var restApiId = adapter.get("restApiId");

  var url = apiUrl + "/users/" + userId;

  return $.ajax({
    url: url,
    type: "DELETE",
    beforeSend: function(request) {
      request.setRequestHeader("X-Parse-Application-Id", applicationId);
      request.setRequestHeader("X-Parse-REST-API-Key", restApiId);
      request.setRequestHeader("X-Parse-Session-Token", sessionToken);
      request.setRequestHeader("Content-Type", "application/json");
    }
  });
}

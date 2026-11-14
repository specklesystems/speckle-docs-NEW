using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

public record PropertiesRequest(string ProjectId, string ModelId, string VersionId);

public record ArtifactList(List<ArtifactFile> Files);

public class PropertiesFunction
{
    private static readonly HttpClient Http = new();
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly string SpeckleUrl =
        Environment.GetEnvironmentVariable("SPECKLE_URL") ?? "https://app.speckle.systems";

    [Function("properties")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req)
    {
        var body = (await JsonSerializer.DeserializeAsync<PropertiesRequest>(req.Body, Json))!;

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{SpeckleUrl}/api/v2/projects/{body.ProjectId}/models/{body.ModelId}" +
            $"/versions/{body.VersionId}/artifacts");
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer", Environment.GetEnvironmentVariable("SPECKLE_TOKEN"));
        using var response = await Http.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var failed = req.CreateResponse(response.StatusCode);
            await failed.WriteStringAsync(await response.Content.ReadAsStringAsync());
            return failed;
        }
        var artifacts = (await response.Content.ReadFromJsonAsync<ArtifactList>(Json))!;

        try
        {
            var ok = req.CreateResponse(HttpStatusCode.OK);
            await ok.WriteAsJsonAsync(BundleProperties.VersionProperties(artifacts.Files));
            return ok;
        }
        catch (MissingBundleFileException err)
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            await notFound.WriteStringAsync(err.Message);
            return notFound;
        }
    }
}

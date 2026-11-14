"""Runs the Lambda handler end to end against a generated bundle, with Speckle mocked."""

import base64
import json
import os
import tempfile
import unittest
from unittest import mock

from test_properties import write_bundle

os.environ.setdefault("FUNCTION_KEY", "test-key")
os.environ.setdefault("SPECKLE_TOKEN", "test-token")

import lambda_function  # noqa: E402

BODY = {"projectId": "p1", "modelId": "m1", "versionId": "v1"}


def event(body=BODY, key="test-key", encode=False):
    raw = json.dumps(body)
    if encode:
        raw = base64.b64encode(raw.encode()).decode()
    return {"headers": {"x-api-key": key}, "body": raw, "isBase64Encoded": encode}


class LambdaHandlerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        files = write_bundle(self.tmp.name)
        speckle = mock.Mock(ok=True, status_code=200)
        speckle.json.return_value = {"files": files}
        patcher = mock.patch.object(lambda_function.requests, "get", return_value=speckle)
        self.get = patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        self.tmp.cleanup()

    def test_returns_rows_as_json(self):
        result = lambda_function.lambda_handler(event(), None)
        self.assertEqual(result["statusCode"], 200)
        rows = json.loads(result["body"])
        self.assertEqual(len(rows), 6)
        self.assertIn("/projects/p1/models/m1/versions/v1/artifacts", self.get.call_args.args[0])

    def test_accepts_a_base64_body(self):
        self.assertEqual(lambda_function.lambda_handler(event(encode=True), None)["statusCode"], 200)

    def test_rejects_a_wrong_key(self):
        result = lambda_function.lambda_handler(event(key="nope"), None)
        self.assertEqual(result["statusCode"], 401)
        self.get.assert_not_called()

    def test_passes_speckle_errors_through(self):
        self.get.return_value = mock.Mock(ok=False, status_code=403, text="Forbidden")
        self.assertEqual(lambda_function.lambda_handler(event(), None)["statusCode"], 403)


if __name__ == "__main__":
    unittest.main()

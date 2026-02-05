import React, { useState, useEffect } from 'react';

const ConnectorVersionFetcher = ({
  connector,
  buttonText,
  buttonColor = '#3b82f6',
  fileExtension = '.zip',
  artifactPath,
  filenamePattern,
}) => {
  // Utility to format connector names for display
  const formatConnectorName = (connectorName) => {
    const specialCases = {
      'powerbi': 'Power BI',
      'civil3d': 'Civil 3D',
      'autocad': 'AutoCAD',
      'archicad': 'ArchiCAD',
      'sketchup': 'SketchUp',
      'navisworks': 'Navisworks',
    };
    return specialCases[connectorName.toLowerCase()] ||
           connectorName.charAt(0).toUpperCase() + connectorName.slice(1);
  };

  // Smart defaults based on connector
  const defaultArtifactPath = artifactPath || `build-artifacts/${connector}-v3/`;
  const defaultFilenamePattern = filenamePattern || `speckle.${connector}.installer-`;
  const displayName = formatConnectorName(connector);
  const defaultButtonText = buttonText || `Download ${displayName} connector`;

  const [version, setVersion] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const parseXMLResponse = (xmlText) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const contents = xmlDoc.getElementsByTagName('Contents');
      const connectorEntries = [];

      for (let content of contents) {
        const key = content.getElementsByTagName('Key')[0]?.textContent;
        const lastModified = content.getElementsByTagName('LastModified')[0]?.textContent;

        if (key &&
            key.includes(defaultArtifactPath) &&
            key.includes(defaultFilenamePattern) &&
            key.endsWith(fileExtension)) {
          const regex = new RegExp(`${defaultFilenamePattern.replace(/\./g, '\\.')}(\\d+\\.\\d+\\.\\d+)${fileExtension.replace(/\./g, '\\.')}$`);
          const versionMatch = key.match(regex);
          if (versionMatch) {
            connectorEntries.push({
              version: versionMatch[1],
              key: key,
              lastModified: new Date(lastModified)
            });
          }
        }
      }

      if (connectorEntries.length === 0) {
        throw new Error(`No ${connector} build artifacts found`);
      }

      connectorEntries.sort((a, b) => b.lastModified - a.lastModified);
      return connectorEntries[0].version;

    } catch (parseError) {
      console.error('Error parsing XML:', parseError);
      throw parseError;
    }
  };

  const fetchLatestVersion = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://releases.speckle.dev');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const latestVersion = parseXMLResponse(xmlText);

      setVersion(latestVersion);
      setError(false);

    } catch (fetchError) {
      console.error('Error fetching latest version:', fetchError);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestVersion();
  }, []);

  useEffect(() => {
    if (version) {
      const url = `https://releases.speckle.dev/${defaultArtifactPath}${defaultFilenamePattern}${version}${fileExtension}`;
      setDownloadUrl(url);
    }
  }, [version]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}>
        Loading latest version...
      </div>
    );
  }

  if (error || !downloadUrl) {
    return (
      <div style={{ textAlign: 'center', padding: '8px', color: '#ef4444' }}>
        Unable to fetch latest version. Please try again later.
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          backgroundColor: buttonColor,
          color: 'white',
          padding: '8px 16px',
          borderRadius: '6px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        {defaultButtonText}
      </a>
    </div>
  );
};

export default ConnectorVersionFetcher;

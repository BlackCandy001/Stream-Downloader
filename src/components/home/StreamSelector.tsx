import React from "react";
import { Card, Checkbox, Radio, Space, Tag, Typography, Button } from "antd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const { Text } = Typography;

interface Stream {
  id: string;
  type: "video" | "audio" | "subtitle";
  quality?: string;
  bandwidth?: number;
  codecs?: string;
  language?: string;
  channels?: string;
  subtitleFormat?: string;
}

interface StreamSelectorProps {
  streams: Stream[];
  onSelectionChange: (selected: string[]) => void;
}

const SelectorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-bottom: 24px;
`;

const SectionTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-main);

  .icon {
    font-size: 22px;
  }
`;

const StyledStreamCard = styled.div<{ selected: boolean; type?: string }>`
  background: ${(props) =>
    props.selected ? "rgba(56, 189, 248, 0.1)" : "var(--glass)"};
  border: 1px solid
    ${(props) => (props.selected ? "var(--primary)" : "var(--glass-border)")};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  overflow: hidden;

  &:hover {
    background: ${(props) =>
      props.selected ? "rgba(56, 189, 248, 0.15)" : "var(--surface-hover)"};
    border-color: ${(props) =>
      props.selected ? "var(--primary)" : "rgba(56, 189, 248, 0.4)"};
    transform: translateX(4px);
  }

  ${(props) =>
    props.selected &&
    `
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 4px;
      background: var(--gradient-primary);
    }
  `}

  .radio-circle, .checkbox-square {
    width: 20px;
    height: 20px;
    border: 2px solid
      ${(props) => (props.selected ? "var(--primary)" : "var(--text-muted)")};
    border-radius: ${(props) => (props.type === "video" ? "50%" : "6px")};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &::after {
      content: "";
      width: 10px;
      height: 100%;
      background: var(--primary);
      border-radius: inherit;
      transform: scale(${(props) => (props.selected ? 1 : 0)});
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
  }
`;

const StreamInfo = styled.div`
  flex: 1;

  .quality-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }

  .details-row {
    font-size: 13px;
    color: var(--text-muted);
  }
`;

const formatBandwidth = (bandwidth?: number) => {
  if (!bandwidth) return "";
  if (bandwidth >= 1000000) {
    return `${(bandwidth / 1000000).toFixed(1)} Mbps`;
  }
  return `${(bandwidth / 1000).toFixed(1)} Kbps`;
};

const StreamSelector: React.FC<StreamSelectorProps> = ({
  streams,
  onSelectionChange,
}) => {
  const { t } = useTranslation();

  const videoStreams = streams.filter((s) => s.type === "video");
  const audioStreams = streams.filter((s) => s.type === "audio");
  const subtitleStreams = streams.filter((s) => s.type === "subtitle");

  const [selectedVideo, setSelectedVideo] = React.useState<string[]>([]);
  const [selectedAudio, setSelectedAudio] = React.useState<string[]>([]);
  const [selectedSubs, setSelectedSubs] = React.useState<string[]>([]);

  React.useEffect(() => {
    const all = [...selectedVideo, ...selectedAudio, ...selectedSubs];
    onSelectionChange(all);
  }, [selectedVideo, selectedAudio, selectedSubs]);

  const toggleSelection = (streamId: string, type: string) => {
    if (type === "video") {
      setSelectedVideo(selectedVideo.includes(streamId) ? [] : [streamId]);
    } else if (type === "audio") {
      setSelectedAudio(
        selectedAudio.includes(streamId)
          ? selectedAudio.filter((id) => id !== streamId)
          : [...selectedAudio, streamId],
      );
    } else if (type === "subtitle") {
      setSelectedSubs(
        selectedSubs.includes(streamId)
          ? selectedSubs.filter((id) => id !== streamId)
          : [...selectedSubs, streamId],
      );
    }
  };

  const selectAll = (type: string) => {
    if (type === "video") {
      setSelectedVideo(videoStreams.map((s) => s.id));
    } else if (type === "audio") {
      setSelectedAudio(audioStreams.map((s) => s.id));
    } else if (type === "subtitle") {
      setSelectedSubs(subtitleStreams.map((s) => s.id));
    }
  };

  const deselectAll = (type: string) => {
    if (type === "video") setSelectedVideo([]);
    else if (type === "audio") setSelectedAudio([]);
    else if (type === "subtitle") setSelectedSubs([]);
  };

  return (
    <SelectorContainer>
      {videoStreams.length > 0 && (
        <div>
          <SectionTitle>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flex: 1,
              }}
            >
              <span className="icon">🎬</span>
              <span>{t("home.videoQuality")}</span>
            </div>
            <Space>
              <Button
                size="small"
                type="link"
                onClick={() => selectAll("video")}
              >
                {t("common.selectAll") || "Select All"}
              </Button>
              <Button
                size="small"
                type="link"
                onClick={() => deselectAll("video")}
              >
                {t("common.deselectAll") || "Deselect All"}
              </Button>
            </Space>
          </SectionTitle>
          {videoStreams.map((stream) => (
            <StyledStreamCard
              key={stream.id}
              selected={selectedVideo.includes(stream.id)}
              onClick={() => toggleSelection(stream.id, "video")}
              type="video"
            >
              <div className="radio-circle" />
              <StreamInfo>
                <div className="quality-row">
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--text-main)",
                    }}
                  >
                    {stream.quality || "Unknown"}
                  </Text>
                  {stream.quality && (
                    <Tag
                      color="cyan"
                      style={{
                        borderRadius: "6px",
                        border: "none",
                        background: "rgba(34, 211, 238, 0.1)",
                        color: "#22d3ee",
                      }}
                    >
                      {t("home.recommended")}
                    </Tag>
                  )}
                </div>
                <div className="details-row">
                  {stream.codecs && <span>Codec: {stream.codecs} • </span>}
                  {stream.bandwidth && (
                    <span>{formatBandwidth(stream.bandwidth)}</span>
                  )}
                </div>
              </StreamInfo>
            </StyledStreamCard>
          ))}
        </div>
      )}

      {audioStreams.length > 0 && (
        <div>
          <SectionTitle>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flex: 1,
              }}
            >
              <span className="icon">🔊</span>
              <span>{t("home.audioTracks")}</span>
            </div>
            <Space>
              <Button
                size="small"
                type="link"
                onClick={() => selectAll("audio")}
              >
                {t("common.selectAll")}
              </Button>
              <Button
                size="small"
                type="link"
                onClick={() => deselectAll("audio")}
              >
                {t("common.deselectAll")}
              </Button>
            </Space>
          </SectionTitle>
          {audioStreams.map((stream) => (
            <StyledStreamCard
              key={stream.id}
              selected={selectedAudio.includes(stream.id)}
              onClick={() => toggleSelection(stream.id, "audio")}
              type="audio"
            >
              <div className="checkbox-square" />
              <StreamInfo>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--text-main)",
                  }}
                >
                  {stream.language || "Audio"}
                  {stream.channels && ` - ${stream.channels} CH`}
                </Text>
                <div className="details-row">
                  {stream.codecs && <span>Codec: {stream.codecs}</span>}
                </div>
              </StreamInfo>
            </StyledStreamCard>
          ))}
        </div>
      )}

      {subtitleStreams.length > 0 && (
        <div>
          <SectionTitle>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flex: 1,
              }}
            >
              <span className="icon">📝</span>
              <span>{t("home.subtitles")}</span>
            </div>
            <Space>
              <Button
                size="small"
                type="link"
                onClick={() => selectAll("subtitle")}
              >
                {t("common.selectAll")}
              </Button>
              <Button
                size="small"
                type="link"
                onClick={() => deselectAll("subtitle")}
              >
                {t("common.deselectAll")}
              </Button>
            </Space>
          </SectionTitle>
          {subtitleStreams.map((stream) => (
            <StyledStreamCard
              key={stream.id}
              selected={selectedSubs.includes(stream.id)}
              onClick={() => toggleSelection(stream.id, "subtitle")}
              type="subtitle"
            >
              <div className="checkbox-square" />
              <StreamInfo>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--text-main)",
                  }}
                >
                  {stream.language || "Subtitle"}
                </Text>
                <div className="details-row">
                  {stream.subtitleFormat && (
                    <span>Format: {stream.subtitleFormat}</span>
                  )}
                </div>
              </StreamInfo>
            </StyledStreamCard>
          ))}
        </div>
      )}
    </SelectorContainer>
  );
};

export default StreamSelector;

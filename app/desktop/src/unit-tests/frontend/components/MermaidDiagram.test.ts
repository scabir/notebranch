import React from "react";
import { act, create } from "react-test-renderer";
import mermaid from "mermaid";
import DOMPurify from "dompurify";
import { MermaidDiagram } from "../../../frontend/components/MermaidDiagram";

jest.mock("mermaid", () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    render: jest.fn(),
  },
}));

jest.mock("dompurify", () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((value: string) => value),
  },
}));

const mockedMermaid = mermaid as unknown as {
  initialize: jest.Mock;
  render: jest.Mock;
};
const mockedDOMPurify = DOMPurify as unknown as {
  sanitize: jest.Mock;
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const renderDiagram = async (code: string, isDark: boolean) => {
  let renderer: ReturnType<typeof create> | null = null;

  await act(async () => {
    renderer = create(React.createElement(MermaidDiagram, { code, isDark }));
  });

  await act(async () => {
    await flushPromises();
  });

  return renderer!;
};

const flattenText = (node: any): string => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(flattenText).join("");
  return node.children ? node.children.map(flattenText).join("") : "";
};

describe("MermaidDiagram", () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation((message, ...args) => {
      if (
        typeof message === "string" &&
        message.includes("Function components cannot be given refs")
      ) {
        return;
      }
      originalConsoleError(message, ...args);
    });
  });

  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
  });

  beforeEach(() => {
    mockedMermaid.initialize.mockClear();
    mockedMermaid.render.mockReset();
    mockedMermaid.render.mockResolvedValue({
      svg: "<svg></svg>",
      bindFunctions: jest.fn(),
    });
    mockedDOMPurify.sanitize.mockClear();
    mockedDOMPurify.sanitize.mockImplementation((value: string) => value);
  });

  it("initializes mermaid with light theme and renders diagram", async () => {
    const code = "graph TD; A-->B";

    await renderDiagram(code, false);

    expect(mockedMermaid.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "default",
    });
    expect(mockedMermaid.render).toHaveBeenCalledWith(expect.any(String), code);
  });

  it("initializes mermaid with dark theme", async () => {
    await renderDiagram("graph TD; A-->B", true);

    expect(mockedMermaid.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "dark",
    });
  });

  it("shows error output when render fails", async () => {
    const code = "graph TD; A-->B";
    mockedMermaid.render.mockRejectedValueOnce(new Error("boom"));

    const renderer = await renderDiagram(code, false);

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Mermaid render error");
    expect(text).toContain("boom");

    const pre = renderer.root.findByType("pre");
    expect(pre.children.join("")).toContain(code);
  });

  it("does not attempt to render when code is blank", async () => {
    await renderDiagram("   ", false);

    expect(mockedMermaid.initialize).not.toHaveBeenCalled();
    expect(mockedMermaid.render).not.toHaveBeenCalled();
  });

  it("uses localized fallback when render rejects with a non-Error value", async () => {
    mockedMermaid.render.mockRejectedValueOnce("boom");

    const renderer = await renderDiagram("graph TD; A-->B", false);

    expect(flattenText(renderer.toJSON())).toContain(
      "Failed to render mermaid diagram",
    );
  });

  it("writes svg into the container and binds functions when refs are available", async () => {
    const bindFunctions = jest.fn();
    const useRefSpy = jest
      .spyOn(React, "useRef")
      .mockReturnValueOnce({ current: { innerHTML: "" } } as any)
      .mockReturnValueOnce({ current: "mermaid-fixed" } as any);
    mockedMermaid.render.mockResolvedValueOnce({
      svg: "<svg><g /></svg>",
      bindFunctions,
    });

    await renderDiagram("graph TD; A-->B", false);

    expect(bindFunctions).toHaveBeenCalledWith(
      expect.objectContaining({ innerHTML: "<svg><g /></svg>" }),
    );

    useRefSpy.mockRestore();
  });

  it("sanitizes rendered svg before inserting into innerHTML", async () => {
    const bindFunctions = jest.fn();
    const useRefSpy = jest
      .spyOn(React, "useRef")
      .mockReturnValueOnce({ current: { innerHTML: "" } } as any)
      .mockReturnValueOnce({ current: "mermaid-fixed" } as any);
    mockedMermaid.render.mockResolvedValueOnce({
      svg: "<svg><script>alert('xss')</script><g /></svg>",
      bindFunctions,
    });
    mockedDOMPurify.sanitize.mockImplementationOnce((value: string) =>
      value.replace(/<script[\s\S]*?<\/script>/gi, ""),
    );

    await renderDiagram("graph TD; A-->B", false);

    expect(mockedDOMPurify.sanitize).toHaveBeenCalledWith(
      "<svg><script>alert('xss')</script><g /></svg>",
      {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ["foreignObject"],
      },
    );
    expect(bindFunctions).toHaveBeenCalledWith(
      expect.objectContaining({
        innerHTML: "<svg><g /></svg>",
      }),
    );

    useRefSpy.mockRestore();
  });
});

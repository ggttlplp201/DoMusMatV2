import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/state/locale";
import { ViewModeToggle } from "./ViewModeToggle";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("ViewModeToggle", () => {
  it("renders both segment labels (ZH default)", () => {
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={true} />
      </Wrapper>
    );
    expect(screen.getByRole("tab", { name: /渲染图/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /3D 模型/i })).toBeInTheDocument();
  });

  it("disables 3D 模型 button when modelAvailable is false", () => {
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={false} />
      </Wrapper>
    );
    const modelBtn = screen.getByRole("tab", { name: /3D 模型/i });
    expect(modelBtn).toBeDisabled();
  });

  it("3D 模型 button is enabled when modelAvailable is true", () => {
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={true} />
      </Wrapper>
    );
    const modelBtn = screen.getByRole("tab", { name: /3D 模型/i });
    expect(modelBtn).not.toBeDisabled();
  });

  it("calls onChange with 'rendered' when 渲染图 is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <ViewModeToggle mode="model" onChange={onChange} modelAvailable={true} />
      </Wrapper>
    );
    await user.click(screen.getByRole("tab", { name: /渲染图/i }));
    expect(onChange).toHaveBeenCalledWith("rendered");
  });

  it("calls onChange with 'model' when 3D 模型 is clicked and available", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={onChange} modelAvailable={true} />
      </Wrapper>
    );
    await user.click(screen.getByRole("tab", { name: /3D 模型/i }));
    expect(onChange).toHaveBeenCalledWith("model");
  });

  it("does not call onChange when disabled 3D 模型 is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={false} />
      </Wrapper>
    );
    const modelBtn = screen.getByRole("tab", { name: /3D 模型/i });
    // disabled buttons do not fire click events
    await user.click(modelBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows '即将推出' hint when model is not available (ZH default)", () => {
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={false} />
      </Wrapper>
    );
    expect(screen.getByText("即将推出")).toBeInTheDocument();
  });

  it("does not show '即将推出' hint when model is available", () => {
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={true} />
      </Wrapper>
    );
    expect(screen.queryByText("即将推出")).not.toBeInTheDocument();
  });
});

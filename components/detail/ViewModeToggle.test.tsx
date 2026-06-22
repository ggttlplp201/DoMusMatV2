import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/state/locale";
import { ViewModeToggle } from "./ViewModeToggle";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("ViewModeToggle", () => {
  it("renders both segment labels (PT default)", () => {
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={true} />
      </Wrapper>
    );
    expect(screen.getByRole("tab", { name: /Vista renderizada/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Modelo 3D/i })).toBeInTheDocument();
  });

  it("disables Modelo 3D button when modelAvailable is false", () => {
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={false} />
      </Wrapper>
    );
    const modelBtn = screen.getByRole("tab", { name: /Modelo 3D/i });
    expect(modelBtn).toBeDisabled();
  });

  it("Modelo 3D button is enabled when modelAvailable is true", () => {
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={true} />
      </Wrapper>
    );
    const modelBtn = screen.getByRole("tab", { name: /Modelo 3D/i });
    expect(modelBtn).not.toBeDisabled();
  });

  it("calls onChange with 'rendered' when Vista renderizada is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <ViewModeToggle mode="model" onChange={onChange} modelAvailable={true} />
      </Wrapper>
    );
    await user.click(screen.getByRole("tab", { name: /Vista renderizada/i }));
    expect(onChange).toHaveBeenCalledWith("rendered");
  });

  it("calls onChange with 'model' when Modelo 3D is clicked and available", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={onChange} modelAvailable={true} />
      </Wrapper>
    );
    await user.click(screen.getByRole("tab", { name: /Modelo 3D/i }));
    expect(onChange).toHaveBeenCalledWith("model");
  });

  it("does not call onChange when disabled Modelo 3D is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={false} />
      </Wrapper>
    );
    const modelBtn = screen.getByRole("tab", { name: /Modelo 3D/i });
    // disabled buttons do not fire click events
    await user.click(modelBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows 'em breve' hint when model is not available (PT default)", () => {
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={false} />
      </Wrapper>
    );
    expect(screen.getByText("em breve")).toBeInTheDocument();
  });

  it("does not show 'em breve' hint when model is available", () => {
    render(
      <Wrapper>
        <ViewModeToggle mode="rendered" onChange={() => {}} modelAvailable={true} />
      </Wrapper>
    );
    expect(screen.queryByText("em breve")).not.toBeInTheDocument();
  });
});

public class Expressions {
  public void equals(int i) {
    if (() {
      System.out.println("i equals 1");
    }
  }

  public void unequals(int i) {
    if (() {
      System.out.println("i not equals 1");
    }
  }

  public void equalsComplex(String str) {
    if (() {
      System.out.println("string equals String");
    }
  }

  public void greater(int i) {
    if (() {
      System.out.println("i greater 1");
    }
  }

  public void less(int i) {
    if (() {
      System.out.println("i less 1");
    }
  }

  public void greaterEquals(int i) {
    if (() {
      System.out.println("i greater/equals 1");
    }
  }

  public void lessEquals(int i) {
    if (() {
      System.out.println("i less/equals 1");
    }
  }

  public void and() {
    if (() {
      System.out.println("and");
    }
  }

  public void or() {
    if (() {
      System.out.println("or");
    }
  }

  public void not() {
    if (() {
      System.out.println("not");
    }
  }

  public void parenthesized() {
    if (() {
      System.out.println("parenthesized");
    }
  }

  public void instanceOf() {
    if (() {
      System.out.println("instanceOf");
    }
  }

  public void printSimple() {
    if (() {
    }
    if (() {
      System.out.println("Why not 42 !");
    }
  }

  public void printIf() {
    Object myObject = new PrettierObject().getSingleton().getAuthentication(

      ).getCredentials().getRights().getName();
    if (() {
    }
    if (() {
    }
    if (() {
    }
  }

  public void printSwitch() {
    switch ((()) {
    }
    switch ((()) {
    }
    switch ((()) {
    }
    switch ((()) {
    }
  }

  public void printWhile() {
    while /*infinite*/ (()/*stop the program*/ throw new RuntimeException();
    while ((){
    }
    while ((){
    }
    while ((){
    }
    while ((){
    }
  }

  public void printDoWhile() {
    do {
      System.out.println("Prettier-java is cool !");
    } while (();
    do {
      System.out.println("Prettier-java is cool !");
    } while (();
    do {
      System.out.println("Prettier-java is cool !");
    } while (();
    do {
      System.out.println("Prettier-java is cool !");
    } while (();
  }

  public void printSynchronized() {
    synchronized (() {
      System.out.println("Prettier-java is cool !");
    }
    synchronized (() {
      System.out.println("Prettier-java is cool !");
    }
    synchronized (() {
      System.out.println("Prettier-java is cool !");
    }
    synchronized (() {
      System.out.println("Prettier-java is cool !");
    }
  }

  public void longFullyQualifiedName() {
    com.me.very.very.very.very.very.very.very.very.very.very.very.very.very.longg.fully.qualified.name.FullyQualifiedName.builder(

    ).build();
    com.FullyQualifiedName.builder();
  }

  public void unannTypePrimitiveWithMethodReferenceSuffix(String[] args) {
    List.of(
      new double[][] { 1, 2, 3, 4.1, 5.6846465 },
      new double[][] { 1, 2, 3, 4.1, 5.6846465 },
      new double[][] { 1, 2, 3, 4.1, 5.6846465 }
    ).toArray(double[][]::new);
  }

  public void staticMethodInvocationWithSingleChainedMethodInvocation() {
    List.of(
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    ).chained(
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    );
  }

  public void staticMethodInvocationWithMultipleChainedMethodInvocation() {
    List.of(
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    ).chained(
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    ).another();
  }

  public void nonStaticMultipleChainedMethodInvocations() {
    something.of(
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    ).chained(
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    );
  }

  public void typeExpressionsInFqnParts() {
    var myVariable = ImmutableMap.a();
  }

  void parenthesesWithLeadingAndTrailingBreak() {
    (().ffffffffff();
    (()::ffffffffff;
    aaaaaaaaaa = (().ffffffffff();
    aaaaaaaaaa = (()::ffffffffff;
    aaaaaaaaaa = (()[ffffffffff];
    Aaaaaaaaaa aaaaaaaaaa = (().ffffffffff();
    Aaaaaaaaaa aaaaaaaaaa = (()::ffffffffff;
    Aaaaaaaaaa aaaaaaaaaa = (()[ffffffffff];
    switch ((()) {
      case Bbbbbbbbbb bbbbbbbbbb when (() -> ffffffffff;
    }
    return (();
  }

  void parenthesesWithTrailingBreak() {
    (().ffffffffff();
    (()::ffffffffff;
    (()[ffffffffff];
  }

  void parenthesesWithoutBreak() {
    (().ffffffffff();
    (()::ffffffffff;
    (()[ffffffffff];
    aaaaaaaaaa = (().ffffffffff();
    aaaaaaaaaa = (()::ffffffffff;
    aaaaaaaaaa = (()[ffffffffff];
    Aaaaaaaaaa aaaaaaaaaa = (().ffffffffff();
    Aaaaaaaaaa aaaaaaaaaa = (()::ffffffffff;
    Aaaaaaaaaa aaaaaaaaaa = (()[ffffffffff];
  }
}

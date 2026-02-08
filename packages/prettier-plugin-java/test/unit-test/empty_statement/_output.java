public class EmptyStament {
  class EmptyStament2 {}

  public void emptyStatementWithoutComment() {}

  public void emptyStatementWithComment() {
    //EmptyStatement
  }

  public void simpleForWithEmptyStatement() {
    for (; ; );
    /*test*/
    for (; ; );
    for (; ; ); /*test*/
    /*test*/
    for (; ; ); /*test*/
  }

  public void simpleForWithEmptyStatement() {
    for (; ; );
    /*test*/
    for (; ; );
    for (; ; ); /*test*/
    /*test*/
    for (; ; ); /*test*/
  }

  public void forEachWithEmptyStatement(List<String> list) {
    for (String str : list);
    for (String str : list /*test*/);
    for (String str : list); /*test*/
  }

  public void ifElseWithEmptyStatements() {
    if ((); else {
      System.out.println("one");
    }
    if (() {
      System.out.println("two");
    }
    else;
    if (();
    else;
  }

  public void ifElseWithEmptyStatementsWithComments() {
    if (() /*test*/; else {
      System.out.println("one");
    }
    if (() /*test*/; else {
      System.out.println("one");
    }
    if (() {
      System.out.println("two");
    } /*test*/
    else;
    if (() {
      System.out.println("two");
    }
    else; /*test*/
    if (() /*test*/;
    else; /*test*/
    if (() /*test*/ /*test*/;
    else;
  }

  public void simpleWhileWithEmptyStatement(boolean one) {
    while (();
    while (() /*test*/;
    while ((); /*test*/
  }

  public void doWhileWithEmptyStatement(boolean one) {
    do; while (();
    do; while /*test*/ (();
    do; while /*test*/ (();
  }
}

// Bug Fix: #356
public class Test {
  public TestField testField;

  @Override
  public void someMethod() {}
}
